/**
 * BlobMaster Standalone Keeper Daemon
 * =====================================
 * Run this on ANY server — your laptop, a VPS, a Docker container.
 * It does NOT require Vercel. It does NOT hold user funds.
 *
 * The keeper:
 *   1. Reads on-chain RuleCreated events from the BlobMaster Move contract
 *   2. Fetches the rule object to get user's configured renew_when_epochs_left threshold
 *   3. Checks current blob expiry via the Walrus aggregator REST API
 *   4. If epochs_until_expiry < renew_when_epochs_left, calls execute_renewal()
 *   5. Earns the keeper_reward SUI from the user's Vault as incentive
 *
 * Usage:
 *   KEEPER_PRIVATE_KEY=suiprivkey...  \
 *   BLOBMASTER_PACKAGE_ID=0xf2c231...  \
 *   node keeper.js
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography'
import * as fs from 'fs'
import * as path from 'path'

// ── In-Memory Retry Queue for Walrus API ──────────────────────────────────────
interface RetryJob {
  blobId: string
  ruleId: string
  retriesLeft: number
  nextRetryEpochMs: number
}
const QUEUE_FILE = path.join(__dirname, 'queue.json')

function loadQueue(): RetryJob[] {
  if (fs.existsSync(QUEUE_FILE)) {
    try { return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8')) } catch { return [] }
  }
  return []
}
function saveQueue(q: RetryJob[]) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2))
}

let retryQueue: RetryJob[] = loadQueue()

// ── Config ─────────────────────────────────────────────────────────────────────
const NETWORK           = (process.env.SUI_NETWORK ?? 'testnet') as 'testnet' | 'mainnet'
// Use Tatum RPC if API key is set, otherwise fall back to public fullnode
const TATUM_API_KEY     = process.env.TATUM_API_KEY ?? ''
const TATUM_RPC         = NETWORK === 'mainnet'
  ? 'https://sui-mainnet.gateway.tatum.io'
  : 'https://sui-testnet.gateway.tatum.io'
const RPC_URL           = process.env.SUI_RPC_URL ?? (TATUM_API_KEY ? TATUM_RPC : getFullnodeUrl(NETWORK))
// Default to the deployed BlobMaster package ID
const PACKAGE_ID        = process.env.BLOBMASTER_PACKAGE_ID
  ?? '0x7bee1f8b45bb2fd8350f7a963be2b63f34602b73af36c57d2c3051590266e4ab'
const PRICE_ORACLE_ID   = process.env.PRICE_ORACLE_ID
  ?? '0x763f0c276f1fb8f6e58f59ffe5cdcf4b82e0d3e2d95d7d0e5aed351530a4be3d'
const POLL_INTERVAL_MS  = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10)
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL
  ?? (NETWORK === 'mainnet'
    ? 'https://aggregator.walrus.space'
    : 'https://aggregator.walrus-testnet.walrus.space')

// ── Telemetry Helper ──────────────────────────────────────────────────────────
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
function reportError(type: string, message: string) {
  fetch(`${APP_URL}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'keeper', type, message })
  }).catch(() => {}) // Fire and forget
}

// ── Tatum-authenticated fetch ──────────────────────────────────────────────────
function tatumFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  if (!TATUM_API_KEY) return fetch(input, init)
  return fetch(input, {
    ...init,
    headers: { ...(init?.headers ?? {}), 'x-api-key': TATUM_API_KEY },
  })
}

// ── Keeper keypair ─────────────────────────────────────────────────────────────
function loadKeypair(): Ed25519Keypair {
  const pk = process.env.KEEPER_PRIVATE_KEY
  if (!pk) throw new Error('KEEPER_PRIVATE_KEY env var is required')
  if (pk.startsWith('suiprivkey')) {
    const { secretKey } = decodeSuiPrivateKey(pk)
    return Ed25519Keypair.fromSecretKey(secretKey)
  }
  const hex = pk.startsWith('0x') ? pk.slice(2) : pk
  return Ed25519Keypair.fromSecretKey(new Uint8Array(Buffer.from(hex, 'hex')))
}

// ── Walrus blob expiry query (uses Walrus aggregator REST API) ─────────────────
async function getBlobInfo(blobId: string, currentEpoch: number): Promise<{ epochsLeft: number, sizeBytes: number }> {
  // Try the Walrus aggregator info endpoint
  const infoUrl = `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}/info`
  try {
    const res = await fetch(infoUrl)
    if (res.ok) {
      const data = await res.json() as any
      // API returns { storage: { end_epoch: N, blob_size: S } } or { end_epoch: N }
      const endEpoch = data?.storage?.end_epoch ?? data?.end_epoch
      const sizeBytes = data?.storage?.blob_size ?? data?.blob_size ?? 1000000 // default 1 MB
      if (typeof endEpoch === 'number') {
        return { epochsLeft: Math.max(0, endEpoch - currentEpoch), sizeBytes: Number(sizeBytes) }
      }
    }
  } catch { /* try HEAD fallback */ }

  // HEAD fallback: check if blob exists at all
  const blobUrl = `${WALRUS_AGGREGATOR}/v1/${blobId}`
  try {
    const res = await fetch(blobUrl, { method: 'HEAD' })
    if (!res.ok) {
      console.warn(`[keeper] Blob ${blobId.slice(0, 12)}... not found — may be expired`)
      return { epochsLeft: 0, sizeBytes: 1000000 }
    }
    // If accessible but no epoch info, we can't be sure it needs renewal immediately, so return a safe high number to skip
    return { epochsLeft: 100, sizeBytes: 1000000 }
  } catch {
    console.warn(`[keeper] Cannot reach Walrus aggregator for ${blobId.slice(0, 12)}...`)
    return { epochsLeft: 100, sizeBytes: 1000000 }  // be conservative, don't spam renewals
  }
}

// ── Get rule object fields ────────────────────────────────────────────────────
// Rule configurations are now fetched directly from the RuleCreated event payload
// to avoid N+1 RPC queries for threshold checking.

// ── Get current Sui epoch ─────────────────────────────────────────────────────
async function getCurrentEpoch(client: SuiClient): Promise<number> {
  try {
    const state = await client.getLatestSuiSystemState()
    return Number(state.epoch)
  } catch {
    return Math.floor(Date.now() / (1000 * 60 * 60 * 24)) - 19000
  }
}

// ── Process Retry Queue ───────────────────────────────────────────────────────
async function processRetryQueue(client: SuiClient) {
  const now = Date.now()
  for (let i = retryQueue.length - 1; i >= 0; i--) {
    const job = retryQueue[i]
    if (now >= job.nextRetryEpochMs) {
      console.log(`[keeper] Retrying Walrus publisher for blob ${job.blobId.slice(0, 12)}...`)
      try {
        const publisherUrl = process.env.WALRUS_PUBLISHER_URL ?? (NETWORK === 'mainnet' ? 'https://publisher.walrus.space' : 'https://publisher.walrus-testnet.walrus.space')
        const res = await fetch(`${publisherUrl}/v1/blobs/${job.blobId}?epochs=30`, { method: 'PUT' })
        if (res.ok) {
          console.log(`[keeper] ✅ Walrus extension successful (from retry) for blob ${job.blobId.slice(0, 12)}...`)
          retryQueue.splice(i, 1) // Remove from queue
          saveQueue(retryQueue)
          await triggerWebhook(client, job.ruleId, job.blobId)
        } else {
          throw new Error(`Publisher returned ${res.status}: ${await res.text()}`)
        }
      } catch (e: any) {
        job.retriesLeft--
        if (job.retriesLeft <= 0) {
          console.warn(`[keeper] ❌ Walrus extension permanently failed for blob ${job.blobId} after all retries.`)
          retryQueue.splice(i, 1)
        } else {
          // Exponential backoff
          job.nextRetryEpochMs = now + (1000 * 60 * Math.pow(2, 5 - job.retriesLeft))
          console.warn(`[keeper] ⚠️ Walrus retry failed: ${e.message}. Retries left: ${job.retriesLeft}`)
        }
        saveQueue(retryQueue)
      }
    }
  }
}

// ── Fire Webhook ──────────────────────────────────────────────────────────────
async function triggerWebhook(client: SuiClient, ruleId: string, blobId: string) {
  try {
    const obj = await client.getObject({ id: ruleId, options: { showContent: true } })
    const webhookUrl = (obj.data?.content as any)?.fields?.webhook_url
    if (webhookUrl && webhookUrl.startsWith('http')) {
      console.log(`[keeper] Firing webhook to ${webhookUrl}...`)
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'blob_renewed', blobId, ruleId, timestamp: Date.now() }),
      })
    }
  } catch (e: any) {
    console.warn(`[keeper] ⚠️ Failed to fire webhook for ${blobId}:`, e.message)
  }
}

// ── Main sweep ────────────────────────────────────────────────────────────────
async function sweep(client: SuiClient) {
  let keypair: Ed25519Keypair
  try {
    keypair = loadKeypair()
  } catch (e: any) {
    console.error('[keeper] Cannot load keypair:', e.message)
    return
  }

  console.log(`[keeper] Sweeping ${NETWORK} | keeper: ${keypair.toSuiAddress()} | pkg: ${PACKAGE_ID.slice(0, 14)}...`)

  const currentEpoch = await getCurrentEpoch(client)
  console.log(`[keeper] Current Sui epoch: ${currentEpoch}`)

  let cursor: string | null = null
  const eventType = `${PACKAGE_ID}::vault::RuleCreated`

  while (true) {
    const events = await client.queryEvents({
      query:  { MoveEventType: eventType },
      cursor: cursor ? { txDigest: cursor, eventSeq: '0' } : undefined,
      limit:  50,
    })

    for (const event of events.data) {
      const { rule_id, vault_id, blob_id, renew_when_epochs_left, epochs_to_add, max_price_per_epoch, keeper_reward } = (event.parsedJson ?? {}) as any
      if (!rule_id || !vault_id || !blob_id) continue

      try {
        // Read the user's configured threshold directly from the event payload!
        const threshold   = Number(renew_when_epochs_left ?? 10)
        const blobInfo    = await getBlobInfo(blob_id, currentEpoch)
        const epochsLeft  = blobInfo.epochsLeft

        console.log(`[keeper] Blob ${blob_id.slice(0, 12)}... | epochs left: ${epochsLeft} | threshold: ${threshold}`)

        if (epochsLeft < threshold) {
          console.log(`[keeper] Triggering renewal for blob ${blob_id.slice(0, 12)}...`)

          // Competitive Keeper Bidding:
          // The user sets keeper_reward as a maximum cap. The keeper calculates the lowest fee
          // it is willing to accept (e.g. 0.005 SUI) to undercut competitors and win the renewal task.
          const userMaxReward = BigInt(keeper_reward ?? 50_000_000)
          const keeperMinReward = BigInt(5000000) // 0.005 SUI minimum acceptable
          const requestedRewardMist = userMaxReward < keeperMinReward ? userMaxReward : keeperMinReward

          console.log(`[keeper]   Blob size: ${blobInfo.sizeBytes} bytes`)
          console.log(`[keeper]   Requested reward: ${Number(requestedRewardMist) / 1e9} SUI`)

          const tx = new TransactionBlock()
          tx.moveCall({
            target: `${PACKAGE_ID}::vault::execute_renewal`,
            arguments: [
              tx.object(PRICE_ORACLE_ID),
              tx.object(rule_id),
              tx.object(vault_id),
              tx.pure(requestedRewardMist, 'u64'),
              tx.object('0x6'),
            ],
          })

          const result = await client.signAndExecuteTransactionBlock({
            signer:           keypair,
            transactionBlock: tx,
            options:          { showEffects: true },
          })

          if (result.effects?.status?.status === 'success') {
            console.log(`[keeper] ✅ execute_renewal succeeded! TX: ${result.digest}`)
            
            // Actually call Walrus Publisher to extend the blob's storage!
            console.log(`[keeper] Sending extension request to Walrus publisher...`)
            try {
              const publisherUrl = process.env.WALRUS_PUBLISHER_URL ?? (NETWORK === 'mainnet' ? 'https://publisher.walrus.space' : 'https://publisher.walrus-testnet.walrus.space')
              const res = await fetch(`${publisherUrl}/v1/blobs/${blob_id}?epochs=30`, { method: 'PUT' })
              if (res.ok) {
                console.log(`[keeper] ✅ Walrus extension successful for blob ${blob_id.slice(0, 12)}...`)
                await triggerWebhook(client, rule_id, blob_id)
              } else {
                console.warn(`[keeper] ⚠️ Walrus publisher returned ${res.status}: ${await res.text()}`)
                reportError('walrusPublisherFail', `Returned ${res.status}`)
                retryQueue.push({ blobId: blob_id, ruleId: rule_id, retriesLeft: 5, nextRetryEpochMs: Date.now() + 60000 })
                saveQueue(retryQueue)
              }
            } catch (e: any) {
              console.warn(`[keeper] ⚠️ Walrus publisher request failed:`, e.message)
              reportError('walrusPublisherException', e.message)
              retryQueue.push({ blobId: blob_id, ruleId: rule_id, retriesLeft: 5, nextRetryEpochMs: Date.now() + 60000 })
              saveQueue(retryQueue)
            }
          } else {
            const errorMsg = result.effects?.status?.error ?? 'Unknown'
            console.error(`[keeper] ❌ execute_renewal failed:`, errorMsg)
            reportError('executeRenewalRevert', errorMsg)
          }
        }
      } catch (e: any) {
        console.error(`[keeper] Error processing blob ${blob_id}:`, e.message)
      }
    }

    if (!events.hasNextPage) break
    cursor = events.data[events.data.length - 1]?.id?.txDigest ?? null
  }
}

// ── Poll loop ─────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.KEEPER_PRIVATE_KEY) {
    console.error('[keeper] ERROR: KEEPER_PRIVATE_KEY is required. Set it to your suiprivkey... bech32 key.')
    process.exit(1)
  }
  if (TATUM_API_KEY) {
    console.log(`[keeper] Using Tatum RPC: ${TATUM_RPC}`)
  } else {
    console.log(`[keeper] No TATUM_API_KEY set — using public fullnode. Set TATUM_API_KEY for production.`)
  }
  console.log(`[keeper] BlobMaster Keeper started. Poll interval: ${POLL_INTERVAL_MS}ms`)
  const { SuiHTTPTransport } = require('@mysten/sui.js/client')
  const client = new SuiClient({
    transport: new SuiHTTPTransport({ url: RPC_URL, fetch: tatumFetch as any })
  })

  while (true) {
    try {
      await processRetryQueue(client)
      await sweep(client)
    } catch (e: any) {
      console.error('[keeper] Sweep error:', e.message)
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
}

main().catch(console.error)
