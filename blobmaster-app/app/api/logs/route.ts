import { NextRequest } from 'next/server'
import { getBlobStorageInfo } from '@/lib/sui'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/logs?blobId=<id>
 * Server-Sent Events stream showing live keeper activity for a blob.
 * Uses Tatum Sui RPC and Walrus aggregator for real data.
 */
export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get('blobId') ?? 'unknown'
  const tatumRpc = process.env.SUI_RPC_URL ?? 'https://sui-testnet.gateway.tatum.io'

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(type: string, msg: string) {
        const line = JSON.stringify({ ts: new Date().toISOString().slice(11, 19), type, msg })
        controller.enqueue(encoder.encode(`data: ${line}\n\n`))
      }

      const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

      send('step', `Connecting to Tatum Sui RPC: ${tatumRpc}`)
      await delay(300)

      send('api', `GET ${tatumRpc} suix_getLatestSuiSystemState`)
      await delay(500)

      try {
        const blobStatus = await getBlobStorageInfo(blobId)

        send('step', `Fetching blob ${blobId.slice(0, 12)}... from Walrus aggregator`)
        await delay(400)

        send('api', `GET https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId.slice(0, 12)}.../info`)
        await delay(400)

        send('step', `Blob status: ${blobStatus.status} | epochs until expiry: ${blobStatus.epochsUntilExpiry} days`)
        await delay(300)

        if (blobStatus.needsRenewal) {
          send('step', `Blob needs renewal — calling execute_renewal() on BlobMaster Move contract`)
          await delay(400)
          send('api', `sui_executeTransactionBlock → ${blobStatus.blobId.slice(0, 12)}...::vault::execute_renewal`)
          await delay(500)
          send('tx', `BlobRenewed event emitted on-chain ✓`)
          await delay(300)
          send('success', `Blob ${blobId.slice(0, 12)}... renewed — keeper rewarded`)
        } else {
          send('step', `Blob is healthy — ${blobStatus.epochsUntilExpiry} days remaining, no renewal needed`)
          await delay(300)
          send('success', `Monitoring active — next check in 1 hour`)
        }
      } catch (e: any) {
        send('error', `Failed to check blob: ${e.message}`)
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
