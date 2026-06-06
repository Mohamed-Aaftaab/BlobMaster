import { NextRequest, NextResponse } from 'next/server'
import { BlobMaster } from 'blobmaster-sdk'
import { agentStore } from '@/lib/agent-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/stats
 * Returns on-chain BlobMaster statistics from Sui event log.
 * ?scope=agents → Agent Vault in-memory economy stats
 *
 * All data sourced from the on-chain BlobMaster Move contract events via Tatum RPC.
 * No database required.
 */
export async function GET(req: NextRequest) {
  const scope = new URL(req.url).searchParams.get('scope')

  if (scope === 'agents') {
    return NextResponse.json(agentStore.getStats())
  }

  try {
    const bm = new BlobMaster({
      network:     'testnet',
      tatumApiKey: process.env.TATUM_API_KEY,
    })

    // Count on-chain events (source of truth — no DB needed)
    const [ruleEvents, renewalEvents] = await Promise.all([
      bm.suiClient.queryEvents({
        query: { MoveEventType: `${bm.networkConfig.packageId}::vault::RuleCreated` },
        limit: 50,
      }),
      bm.suiClient.queryEvents({
        query: { MoveEventType: `${bm.networkConfig.packageId}::vault::BlobRenewed` },
        limit: 50,
      }),
    ])

    return NextResponse.json({
      totalRulesCreated:   ruleEvents.data.length,
      totalRenewals:       renewalEvents.data.length,
      activeRules:         ruleEvents.data.length,
      source:              'on-chain',
      network:             'testnet',
      packageId:           bm.networkConfig.packageId,
      tatumRpcUsed:        !!process.env.TATUM_API_KEY,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to query on-chain stats: ${e.message}` },
      { status: 500 }
    )
  }
}
