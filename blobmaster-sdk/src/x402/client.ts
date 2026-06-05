import type { WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { InvalidWalletError } from '../errors'

export type X402Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CreatePaymentHeaderFn = (signer: any, x402Version: number, requirements: any) => Promise<string>

/**
 * Creates a fetch wrapper that automatically handles x402 Payment Required responses.
 *
 * @param wallet - A viem WalletClient (EOA, browser) or { privateKey } (server/agent)
 * @param _network - Ignored; network comes from the 402 response itself
 * @param createPaymentHeader - Optional in Node.js (imported from x402/client dynamically).
 *   In Next.js/browser environments pass it explicitly to avoid bundler errors:
 *   `import { createPaymentHeader } from 'x402/client'`
 */
export function createX402Fetch(
  wallet: WalletClient | { privateKey: `0x${string}` },
  _network: string,
  createPaymentHeader?: CreatePaymentHeaderFn
): X402Fetch {
  return async function x402Fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let res = await fetch(input, init)
    if (res.status !== 402) return res

    let paymentRequired: any
    try { paymentRequired = await res.json() } catch { return res }

    const accepts = paymentRequired.accepts
    if (!Array.isArray(accepts) || accepts.length === 0) return res

    const requirements = accepts[0]
    const x402Version = paymentRequired.x402Version ?? 1

    // Resolve the payment header function
    let payFn = createPaymentHeader
    if (!payFn) {
      try {
        const specifier = 'x402/client'
        const mod: any = await import(/* @vite-ignore */ specifier)
        payFn = mod.createPaymentHeader
      } catch {
        console.error('[blobmaster-sdk] Could not import x402/client — pass createPaymentHeader as 3rd arg')
        return res
      }
    }

    // Resolve the signer — use createSigner from x402/types for private keys (proper EOA WalletClient)
    let signer: any
    if ('privateKey' in wallet) {
      try {
        const specifier = 'x402/types'
        const mod: any = await import(/* @vite-ignore */ specifier)
        const createSigner = mod.createSigner ?? mod.default?.createSigner
        signer = await createSigner('base-sepolia', wallet.privateKey)
      } catch {
        // Fallback to viem LocalAccount (works too since x402 accepts LocalAccount)
        signer = privateKeyToAccount(wallet.privateKey)
      }
    } else {
      if (!wallet.account) throw new InvalidWalletError('WalletClient must have an account attached')
      signer = wallet
    }

    const paymentHeader = await payFn!(signer, x402Version, requirements)

    const retryInit: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        'X-PAYMENT': paymentHeader,
        'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
      },
    }

    res = await fetch(input, retryInit)

    if (res.status === 402) {
      const errBody = await res.clone().json().catch(() => null)
      console.error('[blobmaster-sdk] Payment rejected by server:', JSON.stringify(errBody))
    }

    return res
  }
}
