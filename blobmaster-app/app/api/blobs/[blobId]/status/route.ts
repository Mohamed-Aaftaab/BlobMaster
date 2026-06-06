import { NextRequest, NextResponse } from 'next/server'
import { getBlobFromChain } from '@/lib/sui'
import { validateBlobId } from 'blobmaster-sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { blobId: string } }
) {
  const { blobId } = params

  try {
    validateBlobId(blobId)
  } catch {
    return NextResponse.json({ error: 'Invalid blob ID (must be a valid base64url Walrus blob ID)' }, { status: 400 })
  }

  try {
    const blob = await getBlobFromChain(blobId)
    return NextResponse.json(blob)
  } catch (e: any) {
    if (e.message?.includes('not found')) {
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Chain query failed' }, { status: 500 })
  }
}
