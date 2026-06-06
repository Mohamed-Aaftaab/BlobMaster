import { NextRequest, NextResponse } from 'next/server'
import { agentStore } from '@/lib/agent-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: { blobId: string } },
) {
  const { blobId: raw } = ctx.params
  const blobId = decodeURIComponent(raw)
  const row = agentStore.listings.get(blobId)
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    blobId,
    agentId:          row.agentId,
    pricePerRetrieve: row.pricePerRetrieve,
    bytes:            row.bytes,
  })
}
