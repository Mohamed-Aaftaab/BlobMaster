import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WALLET = (process.env.BLOBMASTER_WALLET_ADDRESS ?? '') as `0x${string}`

function isDemo(req: NextRequest) {
  const h = req.headers.get('x-demo')
  return h === '1' || h === 'true'
}

function demoResult(blobId: string) {
  const now = Date.now()
  // ~180 days, matching the UI copy; Sui epochs are ~30s but this is a local demo.
  const approxSixMonthsMs = 180 * 24 * 60 * 60 * 1000
  return {
    renewed: true,
    blobId,
    txHash: '0xdemo',
    paymentTxHash: '0xdemo',
    actualCostETH: '0.000',
    newExpiryEpoch: 0,
    newExpiryDate: new Date(now + approxSixMonthsMs).toISOString(),
    suivisionUrl: null,
    basescanUrl: null,
    demoPaid: true,
  }
}

async function handler(req: NextRequest) {
  // withX402 calls handler(request) without params — extract blobId from URL
  const blobId = req.nextUrl.pathname.split('/').at(-2) ?? ''

  if (!blobId ) {
    return NextResponse.json({ error: 'Invalid blob ID' }, { status: 400 })
  }

  try {
    const payerAddress = req.headers.get('x-payment-payer') ?? 'unknown'
    const { performRenewal } = await import('@/lib/renew')
    const result = await performRenewal(blobId, payerAddress)
    return NextResponse.json({ ...result, paymentTxHash: req.headers.get('x-payment-tx') ?? '' })
  } catch (e: any) {
    if (e.status) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status })
    if (e.message?.includes('not found')) {
      return NextResponse.json({ error: 'Blob not found', code: 'BLOB_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ error: e.message, code: 'RENEWAL_FAILED' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Demo mode: skip x402 middleware entirely (so no BLOBMASTER_WALLET_ADDRESS required).
  if (isDemo(req)) {
    const blobId = req.nextUrl.pathname.split('/').at(-2) ?? ''
    if (!blobId ) {
      return NextResponse.json({ error: 'Invalid blob ID' }, { status: 400 })
    }
    return NextResponse.json(demoResult(blobId))
  }

  if (!WALLET) {
    return NextResponse.json(
      {
        error:
          'BLOBMASTER_WALLET_ADDRESS not set. Set it to enable paid x402 renewals, or use Demo Mode (header x-demo: 1).',
        code: 'MISSING_WALLET_ADDRESS',
      },
      { status: 500 },
    )
  }

  // Import x402 lazily so demo mode (and missing env) never touches it.
  // This avoids dev-time crashes when BLOBMASTER_WALLET_ADDRESS is unset.
  const { withX402 } = await import('x402-next')
  const paid = withX402(handler as any, WALLET, {
    price: '$0.001',
    network: 'base-sepolia',
    config: {
      description: 'Renew a Sui storage blob via Walrus native extension',
      maxTimeoutSeconds: 60,
    },
  })
  return paid(req)
}
