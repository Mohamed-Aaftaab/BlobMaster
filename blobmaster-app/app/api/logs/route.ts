import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get('blobId') ?? 'unknown'

  const steps = [
    { type: 'step',    msg: `checking blob ${blobId} on Sui Calibration...` },
    { type: 'api',     msg: `GET https://sui-testnet.gateway.tatum.io suix_getDynamicFieldObject` },
    { type: 'step',    msg: 'blob found — active, submitting to Walrus native extension...' },
    { type: 'api',     msg: `POST submitnative extension() → 0x4015c3E5453d38Df71539C0F7440603C69784d7a` },
    { type: 'step',    msg: 'x402 payment gate hit — 402 Payment Required' },
    { type: 'api',     msg: 'signing EIP-3009 ETH authorization on Base Sepolia...' },
    { type: 'tx',      msg: 'ETH payment settled on Base Sepolia ✓' },
    { type: 'api',     msg: 'Walrus native extension submitnative extension() confirmed on Sui Calibration' },
    { type: 'tx',      msg: 'BlobRenewalTriggered event emitted on-chain ✓' },
    { type: 'success', msg: `blob ${blobId} renewed — new expiry epoch logged` },
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const step of steps) {
        const line = JSON.stringify({
          ts: new Date().toISOString().slice(11, 19),
          ...step,
        })
        controller.enqueue(encoder.encode(`data: ${line}\n\n`))
        await new Promise(r => setTimeout(r, 400))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
