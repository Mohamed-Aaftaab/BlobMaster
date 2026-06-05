import { NextRequest, NextResponse } from 'next/server'
import { agentStore } from '@/lib/agent-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: { cid: string } },
) {
  const { cid: raw } = ctx.params
  const cid = decodeURIComponent(raw)
  const row = agentStore.listings.get(cid)
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    cid,
    agentId:          row.agentId,
    pricePerRetrieve: row.pricePerRetrieve,
    bytes:            row.bytes,
  })
}
