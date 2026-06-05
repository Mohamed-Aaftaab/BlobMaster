import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBlobFromChain, extendWalrusBlob } from '@/lib/sui'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const registrations = await prisma.autopilot.findMany({ where: { active: true } })
  const results: { blobId: string; renewed: boolean; txHash?: string; error?: string }[] = []

  for (const reg of registrations) {
    try {
      const blob = await getBlobFromChain(reg.blobId)

      if (blob.epochsUntilExpiry < reg.renewWhenEpochsLeft) {
        const { walrusJobId, txHash } = await extendWalrusBlob(reg.blobId)

        await prisma.renewalHistory.create({
          data: { blobId: reg.blobId, txHash, walrusJobId: walrusJobId, epochAtRenewal: blob.currentEpoch },
        })

        if (reg.webhookUrl) {
          fetch(reg.webhookUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ event: 'blob.extended', blobId: reg.blobId, txHash, timestamp: new Date().toISOString() }),
          }).catch(() => {})
        }

        results.push({ blobId: reg.blobId, renewed: true, txHash })
      } else {
        results.push({ blobId: reg.blobId, renewed: false })
      }
    } catch (e: any) {
      results.push({ blobId: reg.blobId, renewed: false, error: e.message })
    }
  }

  return NextResponse.json({ processed: registrations.length, results })
}
