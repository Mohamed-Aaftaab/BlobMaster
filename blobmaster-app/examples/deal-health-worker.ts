/**
 * BlobMaster SDK — real-world example: poll blob health and optionally renew.
 *
 * Run from blobmaster-app (same folder as .env.local):
 *   npx tsx examples/blob-health-worker.ts <blobId>
 *   npx tsx examples/blob-health-worker.ts <blobId> --renew
 *
 * Requires: FILECOIN_WALLET_PRIVATE_KEY (0x + 64 hex), viem peer dep via blobmaster-sdk.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BlobMaster,
  BlobNotFoundError,
  BlobExpiredError,
  BlobMasterError,
} from 'blobmaster-sdk'

function loadEnvLocal(): void {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

async function main(): Promise<void> {
  loadEnvLocal()

  const blobId = process.argv[2] ?? process.env.DEAL_ID
  const doRenew = process.argv.includes('--renew')

  if (!blobId) {
    console.error('Usage: npx tsx examples/blob-health-worker.ts <blobId> [--renew]')
    process.exit(1)
  }

  const pk = process.env.FILECOIN_WALLET_PRIVATE_KEY as `0x${string}` | undefined
  if (!pk || !pk.startsWith('0x') || pk.length !== 66) {
    console.error('Set FILECOIN_WALLET_PRIVATE_KEY in .env.local (0x + 64 hex chars).')
    process.exit(1)
  }

  const sk = new BlobMaster({
    privateKey: pk,
    network: 'calibration',
    suiRpc: process.env.FILECOIN_RPC_URL,
    blobmasterApiUrl: process.env.BLOBMASTER_API_URL,
  })

  try {
    const status = await sk.getBlobStatus(blobId)
    console.log(JSON.stringify(status, null, 2))

    if (!status.needsRenewal) {
      console.log('\n[ok] Blob does not need renewal yet.')
      return
    }

    console.log('\n[warn] Blob is in renewal window (needsRenewal=true).')

    if (!doRenew) {
      console.log('Re-run with --renew to pay for renewal via x402 (USDC on Base Sepolia for calibration).')
      return
    }

    const result = await sk.renewBlob(blobId, { maxPriceUsdc: 1 })
    console.log('\n[renewed]', JSON.stringify(result, null, 2))
  } catch (e) {
    if (e instanceof BlobNotFoundError) {
      console.error('[error] Blob not found:', blobId)
    } else if (e instanceof BlobExpiredError) {
      console.error('[error] Blob expired — renewal may not be possible:', blobId)
    } else if (e instanceof BlobMasterError) {
      console.error('[error]', e.code, e.message)
    } else {
      console.error(e)
    }
    process.exit(1)
  }
}

main()
