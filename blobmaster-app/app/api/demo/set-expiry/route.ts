import { NextRequest, NextResponse } from 'next/server'
import { setBlobExpiry } from '@/lib/sui'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { blobId, secondsFromNow = 120, clear = false } = await req.json()
  if (!blobId) return NextResponse.json({ error: 'blobId required' }, { status: 400 })

  try {
    const epochs = Math.floor(secondsFromNow / 30) // Assuming 30s per epoch for demo
    const txHash = await setBlobExpiry(String(blobId), clear ? 1000 : epochs)

    return NextResponse.json({
      set: true,
      blobId,
      secondsFromNow: clear ? 0 : secondsFromNow,
      expiresIn: clear ? 'cleared' : `${secondsFromNow}s`,
      txHash,
      suivisionUrl: `https://suivision.xyz/txblock/${txHash}`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}