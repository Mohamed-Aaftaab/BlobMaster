import { NextRequest, NextResponse } from 'next/server'
import { getBlobStorageInfo } from '@/lib/sui'
import { BlobMaster } from 'blobmaster-sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/autopilot/[blobId]
 * Returns on-chain autopilot rules and blob status for a given blob ID.
 * Reads from the BlobMaster Move contract events — no database required.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { blobId: string } }
) {
  const { blobId } = params

  try {
    const bm = new BlobMaster({
      network:    'testnet',
      tatumApiKey: process.env.TATUM_API_KEY,
    })

    // Get real blob status from Walrus aggregator
    const blobStatus = await getBlobStorageInfo(blobId)

    // Query on-chain rules for this blob
    const allRules = await bm.getAllRules(100)
    const blobRules = allRules.filter((r: any) => r?.blob_id === blobId)

    return NextResponse.json({
      blobId,
      monitoringActive:   blobRules.length > 0,
      rules:              blobRules,
      blobStatus,
      source:             'on-chain',
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to query on-chain rules: ${e.message}` },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/autopilot/[blobId]
 * Note: Rule deletion requires the vault owner's wallet signature.
 * This endpoint returns the unsigned PTB — the frontend must sign it.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { blobId: string } }
) {
  const { blobId } = params
  const body = await req.json().catch(() => ({}))
  const { ruleId, vaultId } = body as { ruleId?: string; vaultId?: string }

  if (!ruleId || !vaultId) {
    return NextResponse.json(
      { error: 'ruleId and vaultId are required in the request body' },
      { status: 400 }
    )
  }

  const bm     = new BlobMaster({ network: 'testnet', tatumApiKey: process.env.TATUM_API_KEY })
  const txb    = bm.deleteRuleTx(ruleId, vaultId)
  const txData = txb.serialize()

  return NextResponse.json({
    message: 'Sign this transaction with your wallet to delete the autopilot rule',
    blobId,
    ruleId,
    vaultId,
    unsignedTx: txData,
  })
}
