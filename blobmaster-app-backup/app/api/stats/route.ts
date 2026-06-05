import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { agentStore } from '@/lib/agent-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Default: BlobMaster DB metrics. `?scope=agents` → Agent Vault in-memory economy stats. */
export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get('scope')

  if (scope === 'agents') {
    return NextResponse.json(agentStore.getStats())
  }

  if (!prisma) {
    return NextResponse.json({ totalRenewals: 0, activeAutopilots: 0, dbConfigured: false })
  }

  const [totalRenewals, activeAutopilots] = await Promise.all([
    prisma.renewalHistory.count(),
    prisma.autopilot.count({ where: { active: true } }),
  ])

  return NextResponse.json({ totalRenewals, activeAutopilots, dbConfigured: true })
}
