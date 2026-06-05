import { NextRequest, NextResponse } from 'next/server'
import { createSigner } from 'x402/types'
import { createPaymentHeader } from 'x402/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function decodePaymentResponse(header: string | null) {
  if (!header) return {}
  try { return JSON.parse(Buffer.from(header, 'base64').toString('utf-8')) } catch { return {} }
}

export async function POST(req: NextRequest) {
  const pk = process.env.FILECOIN_WALLET_PRIVATE_KEY as `0x${string}`
  if (!pk) return NextResponse.json({ error: 'Server wallet not configured' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const url = `${baseUrl}/api/autopilot`
  const body = await req.json()
  const bodyStr = JSON.stringify(body)

  // Step 1: initial request to get 402
  const first = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
  })
  if (first.status !== 402) {
    const data = await first.json().catch(() => ({}))
    return NextResponse.json(data, { status: first.status })
  }

  // Step 2: parse payment requirements
  const { x402Version = 1, accepts } = await first.json()
  if (!Array.isArray(accepts) || accepts.length === 0) {
    return NextResponse.json({ error: 'No payment requirements' }, { status: 402 })
  }

  // Step 3: sign with EOA private key
  const signer = await createSigner('base-sepolia', pk)
  const paymentHeader = await createPaymentHeader(signer, x402Version, accepts[0])

  // Step 4: retry with payment header
  const paid = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': paymentHeader,
      'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
    },
    body: bodyStr,
  })

  const data = await paid.json().catch(() => ({}))
  if (!paid.ok) return NextResponse.json(data, { status: paid.status })

  const payment = decodePaymentResponse(paid.headers.get('X-PAYMENT-RESPONSE'))
  return NextResponse.json({ ...data, paymentTxHash: payment.transaction ?? null })
}
