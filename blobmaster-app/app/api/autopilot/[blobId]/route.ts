import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { blobId: string } }
) {
  const { blobId } = params

  const ap = await prisma.autopilot.findUnique({
    where: { blobId },
    include: { renewals: { orderBy: { createdAt: 'desc' } } },
  })

  if (!ap) {
    return NextResponse.json({ error: 'No autopilot registered for this blob' }, { status: 404 })
  }

  const totalSpent = ap.renewals.reduce((sum: number, _r: unknown) => sum + 0.25, 0)

  return NextResponse.json({
    blobId,
    monitoringActive: ap.active,
    renewalHistory: ap.renewals.map((r: { epochAtRenewal: number; txHash: string; createdAt: Date }) => ({
      epoch:     r.epochAtRenewal,
      txHash:    r.txHash,
      costUsdc:  '0.25',
      timestamp: r.createdAt.toISOString(),
    })),
    totalSpentUsdc:  totalSpent.toFixed(2),
    nextCheckAt:     new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { blobId: string } }
) {
  const { blobId } = params

  await prisma.autopilot.update({
    where:  { blobId },
    data:   { active: false },
  })

  return NextResponse.json({ disabled: true, blobId })
}
