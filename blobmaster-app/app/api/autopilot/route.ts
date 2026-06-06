import { NextRequest, NextResponse } from 'next/server'
import { withX402 } from 'x402-next'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WALLET = process.env.BLOBMASTER_WALLET_ADDRESS! as `0x${string}`

async function handler(req: NextRequest) {
  const body = await req.json()
  const { blobId, renewWhenEpochsLeft = 100_000, maxPriceETH = 1.00, webhookUrl } = body

  if (!blobId) {
    return NextResponse.json({ error: 'blobId is required' }, { status: 400 })
  }

  const registration = await prisma.autopilot.upsert({
    where:  { blobId },
    update: { renewWhenEpochsLeft, maxPriceETH, webhookUrl, active: true },
    create: { blobId, renewWhenEpochsLeft, maxPriceETH, webhookUrl, active: true },
  })

  return NextResponse.json({
    autopilotId:          registration.id,
    blobId,
    monitoringActive:     true,
    nextCheckAt:          new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    estimatedRenewalDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    webhookConfigured:    !!webhookUrl,
  })
}

export const POST = withX402(handler as any, WALLET, {
  price: '$0.001',
  network: 'base-sepolia',
  config: {
    description: 'Register blob for autopilot renewal monitoring',
    maxTimeoutSeconds: 30,
  },
})
