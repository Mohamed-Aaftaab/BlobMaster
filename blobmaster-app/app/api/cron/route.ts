import { NextRequest, NextResponse } from 'next/server'
import { getBlobStorageInfo, extendWalrusBlob } from '@/lib/sui'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Legacy cron route — kept for backward compatibility but now delegates to the keeper.
 * In the new architecture, use /api/keeper instead.
 * This route uses the Prisma autopilot DB only as a fallback registry for blobs
 * that were registered before the on-chain Move contract was deployed.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirect internally to the keeper endpoint for on-chain processing
  const keeperUrl = new URL('/api/keeper', req.url)
  const keeperRes = await fetch(keeperUrl.toString(), {
    headers: { 'authorization': `Bearer ${process.env.CRON_SECRET}` },
  })

  const keeperData = await keeperRes.json()
  return NextResponse.json({ source: 'cron->keeper', ...keeperData })
}
