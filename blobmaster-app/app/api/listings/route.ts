import { NextResponse } from 'next/server'
import { agentStore } from '@/lib/agent-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const listings = Array.from(agentStore.listings.entries()).map(([blobId, l]) => ({
    blobId,
    ...l,
  }))
  return NextResponse.json(listings)
}
