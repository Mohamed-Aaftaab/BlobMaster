import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { blobId, renewWhenEpochsLeft = 100_000, maxPriceETH = 1.0, webhookUrl } = body

  if (!blobId) {
    return NextResponse.json({ error: 'blobId is required' }, { status: 400 })
  }

  // DB skipped — demo mode returns success without persistence
  return NextResponse.json({
    autopilotId: `demo-${blobId}-${Date.now()}`,
    blobId,
    monitoringActive: true,
    renewWhenEpochsLeft,
    maxPriceETH,
    nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    webhookConfigured: !!webhookUrl,
    demoPaid: true,
  })
}
