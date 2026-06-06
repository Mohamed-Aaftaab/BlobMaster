import { NextRequest, NextResponse } from 'next/server'
import { BlobMaster } from 'blobmaster-sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/audit?blobId=<id>
 * Returns the on-chain renewal history for a blob from BlobRenewed events.
 * Cryptographically verifiable — all data sourced from the Sui blockchain via Tatum RPC.
 * No database required.
 */
export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get('blobId')
  if (!blobId) {
    return NextResponse.json({ error: 'blobId query parameter is required' }, { status: 400 })
  }

  try {
    const bm = new BlobMaster({
      network:     'testnet',
      tatumApiKey: process.env.TATUM_API_KEY,
    })

    // Query on-chain BlobRenewed events for this blob
    const events = await bm.suiClient.queryEvents({
      query: { MoveEventType: `${bm.networkConfig.packageId}::vault::BlobRenewed` },
      limit: 100,
    })

    const blobEvents = events.data
      .filter(e => (e.parsedJson as any)?.blob_id === blobId)
      .map(e => ({
        txHash:         e.id.txDigest,
        epochAtRenewal: (e.parsedJson as any)?.epoch ?? 0,
        keeper:         (e.parsedJson as any)?.keeper ?? 'unknown',
        epochsAdded:    (e.parsedJson as any)?.epochs_added ?? 0,
        timestamp:      e.timestampMs ? new Date(Number(e.timestampMs)).toISOString() : null,
      }))

    return NextResponse.json({
      blobId,
      source:       'on-chain',
      verifiable:   `https://testnet.suivision.xyz/package/${bm.networkConfig.packageId}`,
      renewalCount: blobEvents.length,
      history:      blobEvents,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to query on-chain audit trail: ${e.message}` },
      { status: 500 }
    )
  }
}
