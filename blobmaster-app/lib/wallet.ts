'use client'

// Back-compat shim: older dashboard imports '@/lib/wallet'.
// The actual implementation lives in `lib/browser-wallet.ts`.

export {
  assertWalletOnBaseSepolia,
  connectBaseSepoliaWallet,
  disconnectBaseWallet,
} from '@/lib/browser-wallet'

import type { connectBaseSepoliaWallet } from '@/lib/browser-wallet'

/**
 * Return an already-connected wallet client if available.
 * Base Account SDK does not currently expose a stable "isConnected" check,
 * so we attempt a lightweight connect-less read via `eth_accounts` and
 * only construct a client when an account is present.
 */
export async function getWalletClient(): Promise<Awaited<ReturnType<typeof connectBaseSepoliaWallet>> | null> {
  if (typeof window === 'undefined') return null
  try {
    const { createBaseAccountSDK } = await import('@base-org/account')
    const { createWalletClient, custom } = await import('viem')
    const { baseSepolia } = await import('viem/chains')
    const { publicActions } = await import('viem')

    const provider = createBaseAccountSDK({
      appName: 'BlobMaster',
      appLogoUrl: 'https://base.org/logo.png',
      appChainIds: [baseSepolia.id],
    }).getProvider() as any

    const accounts = (await provider.request({ method: 'eth_accounts' })) as `0x${string}`[]
    const address = accounts?.[0]
    if (!address) return null

    return createWalletClient({
      account: address,
      chain: baseSepolia,
      transport: custom(provider),
    }).extend(publicActions)
  } catch {
    return null
  }
}

