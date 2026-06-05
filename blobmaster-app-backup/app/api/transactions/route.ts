import { NextResponse } from 'next/server'
import { agentStore } from '@/lib/agent-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(agentStore.transactions.slice(0, 50))
}
