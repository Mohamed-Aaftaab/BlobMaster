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
  ?? '0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e'
const POLL_INTERVAL_MS  = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10)
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL
  ?? (NETWORK === 'mainnet'
    ? 'https://aggregator.walrus.space'
    : 'https://aggregator.walrus-testnet.walrus.space')

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
async function getBlobEpochsLeft(blobId: string, currentEpoch: number): Promise<number> {
  // Try the Walrus aggregator info endpoint
  const infoUrl = `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}/info`
  try {
    const res = await fetch(infoUrl)
    if (res.ok) {
      const data = await res.json() as any
      // API returns { storage: { end_epoch: N } } or { end_epoch: N }
      const endEpoch = data?.storage?.end_epoch ?? data?.end_epoch
      if (typeof endEpoch === 'number') {
        return Math.max(0, endEpoch - currentEpoch)
      }
    }
  } catch { /* try HEAD fallback */ }

  // HEAD fallback: check if blob exists at all
  const blobUrl = `${WALRUS_AGGREGATOR}/v1/${blobId}`
  try {
    const res = await fetch(blobUrl, { method: 'HEAD' })
    if (!res.ok) {
      console.warn(`[keeper] Blob ${blobId.slice(0, 12)}... not found — may be expired`)
      return 0
    }
    // If accessible but no epoch info, assume it needs checking soon
    return 5
  } catch {
    console.warn(`[keeper] Cannot reach Walrus aggregator for ${blobId.slice(0, 12)}...`)
    return 5  // be conservative, don't spam renewals
  }
}

// ── Get rule object fields ────────────────────────────────────────────────────
async function getRuleThreshold(client: SuiClient, ruleId: string): Promise<number> {
  try {
    const obj = await client.getObject({ id: ruleId, options: { showContent: true } })
    const fields = (obj.data?.content as any)?.fields
    return Number(fields?.renew_when_epochs_left ?? 10)
  } catch {
    return 10 // default threshold
  }
}

// ── Get current Sui epoch ─────────────────────────────────────────────────────
async function getCurrentEpoch(client: SuiClient): Promise<number> {
  try {
    const state = await client.getLatestSuiSystemState()
    return Number(state.epoch)
  } catch {
    return Math.floor(Date.now() / (1000 * 60 * 60 * 24)) - 19000
  }
}

// ── Main sweep ────────────────────────────────────────────────────────────────
async function sweep() {
  const client = new SuiClient({
    url:   RPC_URL,
    fetch: tatumFetch as any,
  })
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
      const { rule_id, vault_id, blob_id } = (event.parsedJson ?? {}) as any
      if (!rule_id || !vault_id || !blob_id) continue

      try {
        // Read the user's configured threshold from on-chain rule object
        const threshold   = await getRuleThreshold(client, rule_id)
        const epochsLeft  = await getBlobEpochsLeft(blob_id, currentEpoch)

        console.log(`[keeper] Blob ${blob_id.slice(0, 12)}... | epochs left: ${epochsLeft} | threshold: ${threshold}`)

        if (epochsLeft < threshold) {
          console.log(`[keeper] Triggering renewal for blob ${blob_id.slice(0, 12)}...`)

          // Storage cost: 30 epochs × ~0.0003 SUI/epoch = 0.009 SUI = 9_000_000 MIST
          const storageCostMist = BigInt(9_000_000)
          const tx = new TransactionBlock()
          tx.moveCall({
            target: `${PACKAGE_ID}::vault::execute_renewal`,
            arguments: [
              tx.object(rule_id),
              tx.object(vault_id),
              tx.pure(storageCostMist),
            ],
          })

          const result = await client.signAndExecuteTransactionBlock({
            signer:           keypair,
            transactionBlock: tx,
            options:          { showEffects: true },
          })

          if (result.effects?.status?.status === 'success') {
            console.log(`[keeper] ✅ execute_renewal succeeded! TX: ${result.digest}`)
            console.log(`[keeper]    Note: on-chain renewal recorded. Walrus extension via WAL coming in v2.`)
          } else {
            console.error(`[keeper] ❌ execute_renewal failed:`, result.effects?.status?.error)
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
  while (true) {
    try {
      await sweep()
    } catch (e: any) {
      console.error('[keeper] Sweep error:', e.message)
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
}

main().catch(console.error)
