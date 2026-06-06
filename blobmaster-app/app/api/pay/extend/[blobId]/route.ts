import { NextRequest, NextResponse } from 'next/server'
import { performRenewal } from '@/lib/renew'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { blobId: string } }
) {
  const pk = process.env.BLOBMASTER_WALLET_PRIVATE_KEY as `0x${string}`
  if (!pk) return NextResponse.json({ error: 'Server wallet not configured' }, { status: 500 })

  try {
    const result = await performRenewal(params.blobId, pk)
    return NextResponse.json({ ...result, paymentTxHash: result.txHash })
  } catch (e: any) {
    if (e.status) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}