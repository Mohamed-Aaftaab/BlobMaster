import { NextRequest, NextResponse } from 'next/server'
import { withX402 } from 'x402-next'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WALLET = process.env.BLOBMASTER_WALLET_ADDRESS! as `0x${string}`

async function handler(req: NextRequest) {
  // Access Control
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid API key' }, { status: 401 })
  }
  const apiKey = authHeader.split(' ')[1]
  // In a real app we'd validate the apiKey against a DB here
  if (apiKey.length < 10) {
    return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 })
  }

  const body = await req.json()
  const { blobId, renewWhenEpochsLeft = 100_000, maxPriceETH = 1.00, webhookUrl } = body

  if (!blobId) {
    return NextResponse.json({ error: 'blobId is required' }, { status: 400 })
  }

  const blobIds = Array.isArray(blobId) ? blobId : [blobId]
  const registrations = []

  for (const id of blobIds) {
    const reg = await prisma.autopilot.upsert({
      where:  { blobId: id },
      update: { renewWhenEpochsLeft, maxPriceETH, webhookUrl, active: true },
      create: { blobId: id, renewWhenEpochsLeft, maxPriceETH, webhookUrl, active: true },
    })
    registrations.push({
      autopilotId:          reg.id,
      blobId:               id,
      monitoringActive:     true,
      nextCheckAt:          new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      estimatedRenewalDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      webhookConfigured:    !!webhookUrl,
    })
  }

  return NextResponse.json(registrations.length === 1 ? registrations[0] : registrations)
}

export const POST = withX402(handler as any, WALLET, {
  price: '$0.001',
  network: 'base-sepolia',
  config: {
    description: 'Register blob for autopilot renewal monitoring',
    maxTimeoutSeconds: 30,
  },
})
