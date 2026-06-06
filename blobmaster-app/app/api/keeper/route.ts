import { NextRequest, NextResponse } from 'next/server'
import { getBlobStorageInfo, extendWalrusBlob } from '@/lib/sui'
import { BlobMaster } from 'blobmaster-sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Keeper endpoint — scans on-chain RuleCreated events from the BlobMaster Move contract
 * and calls execute_renewal for any blob approaching expiry.
 *
 * Can be called by:
 *   - Vercel cron (vercel.json)
 *   - Any external keeper daemon
 *   - The standalone /keeper/keeper.ts script
 *
 * Auth: Set CRON_SECRET env var. If not set, endpoint is open (OK for keeper competition).
 *
 * Uses Tatum RPC (TATUM_API_KEY env var) for Sui node access.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const bm = new BlobMaster({
    network:     'testnet',
    tatumApiKey: process.env.TATUM_API_KEY,
  })

  const results: { blobId: string; renewed: boolean; txHash?: string; error?: string }[] = []

  try {
    const eventsResponse = await bm.suiClient.queryEvents({
      query: { MoveEventType: `${bm.networkConfig.packageId}::vault::RuleCreated` },
      limit: 50,
    })

    for (const event of eventsResponse.data) {
      const { rule_id, vault_id, blob_id } = (event.parsedJson ?? {}) as any
      if (!blob_id) continue

      try {
        const blobStatus = await getBlobStorageInfo(blob_id)

        if (blobStatus.needsRenewal) {
          // Execute renewal via Move contract — keeper earns keeperReward SUI
          const { txHash, keeper } = await extendWalrusBlob(
            blob_id,
            rule_id,
            vault_id,
            blobStatus.renewalEpochs,
          )

          // Fire webhook if registered on the rule
          const webhookUrl = (event.parsedJson as any)?.webhook_url
          if (webhookUrl && webhookUrl.startsWith('http')) {
            fetch(webhookUrl, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                event:          'blob.renewed',
                blobId:         blob_id,
                txHash,
                keeper,
                epochsRemaining: blobStatus.epochsUntilExpiry,
                timestamp:       new Date().toISOString(),
              }),
            }).catch(() => {}) // fire-and-forget
          }

          results.push({ blobId: blob_id, renewed: true, txHash })
        } else {
          results.push({ blobId: blob_id, renewed: false })
        }
      } catch (e: any) {
        results.push({ blobId: blob_id, renewed: false, error: e.message })
      }
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to query on-chain events: ${e.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    status:            'Keeper sweep complete',
    timestamp:         new Date().toISOString(),
    network:           'testnet',
    tatumRpc:          !!process.env.TATUM_API_KEY,
    eventsScanned:     results.length,
    renewalsExecuted:  results.filter(r => r.renewed).length,
    results,
  })
}
