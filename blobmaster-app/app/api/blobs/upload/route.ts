import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER_URL
  ?? 'https://publisher.walrus-testnet.walrus.space'

/**
 * POST /api/blobs/upload
 * Uploads a file to Walrus decentralized storage.
 * 
 * Request: multipart/form-data with a "file" field, or raw binary body
 * Query params:
 *   - epochs: number of storage epochs (default 30 = ~30 days)
 * 
 * Returns: { blobId, size, epochs, walrusUrl, suiExplorerUrl }
 * 
 * The returned blobId can be passed to registerAutopilotTx() to set up
 * automatic renewal via the BlobMaster Move contract.
 */
export async function POST(req: NextRequest) {
  const epochs = parseInt(req.nextUrl.searchParams.get('epochs') ?? '30', 10)

  let body: ArrayBuffer
  let filename = 'blob'
  let contentType = req.headers.get('content-type') ?? 'application/octet-stream'

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file in form data. Use field name "file".' }, { status: 400 })
    }
    body        = await file.arrayBuffer()
    filename    = file.name
    contentType = file.type || 'application/octet-stream'
  } else {
    body = await req.arrayBuffer()
  }

  if (!body.byteLength) {
    return NextResponse.json({ error: 'Empty file body' }, { status: 400 })
  }

  const sizeKb = (body.byteLength / 1024).toFixed(2)

  try {
    // Upload to Walrus decentralized storage
    const walrusUrl   = `${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`
    const walrusRes   = await fetch(walrusUrl, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body,
    })

    if (!walrusRes.ok) {
      const errText = await walrusRes.text()
      return NextResponse.json(
        { error: `Walrus upload failed (${walrusRes.status}): ${errText}` },
        { status: 502 }
      )
    }

    const walrusData = await walrusRes.json() as any

    // Walrus returns: { newlyCreated: { blobObject: { blobId, ... } } }
    //             or: { alreadyCertified: { blobId, ... } }
    const blobId =
      walrusData.newlyCreated?.blobObject?.blobId
      ?? walrusData.alreadyCertified?.blobId
      ?? walrusData.blobId

    if (!blobId) {
      return NextResponse.json(
        { error: 'No blobId in Walrus response', walrusData },
        { status: 502 }
      )
    }

    const isNew = !!walrusData.newlyCreated

    return NextResponse.json({
      blobId,
      filename,
      sizeBytes:       body.byteLength,
      sizeKb,
      epochs,
      daysUntilExpiry: epochs,
      isNew,
      aggregatorUrl:   `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`,
      status:          'uploaded',
      nextStep: [
        `1. Create a Vault: bm.createVaultTx()`,
        `2. Register autopilot: bm.registerAutopilotTx(vaultId, { blobId: "${blobId}" })`,
      ].join(' → '),
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: `Upload error: ${e.message}` },
      { status: 500 }
    )
  }
}

/**
 * GET /api/blobs/upload?blobId=<id>
 * Checks if a blob is accessible on Walrus.
 */
export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get('blobId')
  if (!blobId) {
    return NextResponse.json({ error: 'blobId query param required' }, { status: 400 })
  }

  const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL
    ?? 'https://aggregator.walrus-testnet.walrus.space'

  try {
    // Try info endpoint first
    const infoRes = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}/info`)
    if (infoRes.ok) {
      const data = await infoRes.json() as any
      return NextResponse.json({
        blobId,
        exists:      true,
        endEpoch:    data?.storage?.end_epoch ?? data?.end_epoch,
        aggregatorUrl: `${WALRUS_AGGREGATOR}/v1/${blobId}`,
      })
    }

    // Fallback: HEAD check
    const headRes = await fetch(`${WALRUS_AGGREGATOR}/v1/${blobId}`, { method: 'HEAD' })
    return NextResponse.json({
      blobId,
      exists:       headRes.ok,
      status:       headRes.status,
      aggregatorUrl: `${WALRUS_AGGREGATOR}/v1/${blobId}`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
