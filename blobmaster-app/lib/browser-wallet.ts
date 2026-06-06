'use client'

import { createBaseAccountSDK, type ProviderInterface } from '@base-org/account'
import { createWalletClient, custom } from 'viem'
import type { EIP1193Provider } from 'viem'
import { baseSepolia } from 'viem/chains'
import { publicActions } from 'viem'


/** Base Sepolia — x402 middleware uses this network (not Ethereum Sepolia 11155111). */
const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34' as const // 84532 decimal
const ETH_SEPOLIA_CHAIN_ID = 11155111

let baseAccountProvider: ProviderInterface | null = null

async function getBaseAccountProvider(): Promise<ProviderInterface> {
  if (typeof window === 'undefined') {
    throw new Error('Open this page in a browser to use Base Wallet.')
  }
  if (!baseAccountProvider) {
    baseAccountProvider = createBaseAccountSDK({
      appName: 'BlobMaster',
      appLogoUrl: 'https://base.org/logo.png',
      appChainIds: [baseSepolia.id],
    }).getProvider()
  }
  return baseAccountProvider
}

function rpcErrorCode(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'code' in e) {
    const c = (e as { code: unknown }).code
    if (typeof c === 'number') return c
    if (typeof c === 'string' && /^\d+$/.test(c)) return parseInt(c, 10)
  }
  return undefined
}

async function readChainIdHex(eth: EIP1193Provider): Promise<string> {
  const raw = await eth.request({ method: 'eth_chainId' })
  if (typeof raw === 'string') return raw.toLowerCase()
  if (typeof raw === 'number') return `0x${BigInt(raw).toString(16)}`.toLowerCase()
  throw new Error('Unexpected eth_chainId response from wallet')
}

function chainIdHexToDecimal(hex: string): number {
  return Number.parseInt(hex.replace(/^0x/i, ''), 16)
}

function isBaseSepoliaChain(hex: string): boolean {
  try {
    return BigInt(hex) === BigInt(84532)
  } catch {
    return false
  }
}

async function ensureBaseSepolia(eth: EIP1193Provider) {
  let chainHex = await readChainIdHex(eth).catch(() => '')
  if (isBaseSepoliaChain(chainHex)) return

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
    })
  } catch (e: unknown) {
    const code = rpcErrorCode(e)
    if (code === 4001) {
      throw new Error(
        'You rejected switching networks. BlobMaster x402 needs Base Sepolia (chain 84532), not Ethereum Sepolia (11155111).',
      )
    }
    if (code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
            chainName: 'Base Sepolia',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [baseSepolia.rpcUrls.default.http[0]],
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          },
        ],
      })
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }],
      })
    } else {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`Could not switch to Base Sepolia (84532): ${msg}`)
    }
  }

  chainHex = await readChainIdHex(eth)
  if (!isBaseSepoliaChain(chainHex)) {
    const dec = chainIdHexToDecimal(chainHex)
    const hint =
      dec === ETH_SEPOLIA_CHAIN_ID
        ? ' You are on Ethereum Sepolia; switch to Base Sepolia in the wallet (Settings → Networks) or approve the network switch prompt.'
        : ''
    throw new Error(
      `Wrong network: wallet reports chain ${chainHex} (${dec}). x402 ETH payments require Base Sepolia (84532 / 0x14a34).${hint}`,
    )
  }
}

/**
 * Base Wallet (EIP-1193) sometimes returns ABI-encoded bytes from eth_signTypedData_v4
 * instead of a raw 65-byte signature. The ETH transferWithAuthorization contract call
 * requires a raw sig. Find the 65-byte run inside the ABI blob and return it.
 */
function unwrapSignature(sig: string): `0x${string}` {
  const hex = sig.startsWith('0x') ? sig.slice(2) : sig
  // Raw 65-byte sig = 130 hex chars
  if (hex.length === 130) {
    console.log('[x402] sig already raw 65 bytes')
    return `0x${hex}`
  }
  console.log('[x402] raw sig from wallet length:', hex.length / 2, 'bytes — unwrapping')
  // Search for the 32-byte word 0x41 (= 65) which precedes the raw sig in ABI-encoded bytes
  const needle = '0000000000000000000000000000000000000000000000000000000000000041'
  const idx = hex.indexOf(needle)
  if (idx !== -1) {
    const raw = hex.slice(idx + 64, idx + 64 + 130)
    console.log('[x402] unwrapped sig:', `0x${raw}`)
    if (raw.length === 130) return `0x${raw}`
  }
  console.warn('[x402] could not unwrap sig, returning as-is')
  return `0x${hex}` as `0x${string}`
}

export async function connectBaseSepoliaWallet() {
  const provider = await getBaseAccountProvider()
  const eth = provider as EIP1193Provider

  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as `0x${string}`[]
  const address = accounts[0]
  if (!address) throw new Error('No accounts returned. Sign in with Base and try again.')

  await ensureBaseSepolia(eth)

  // Wrap the provider so eth_signTypedData_v4 always returns a raw 65-byte signature.
  // Use Object.create to preserve prototype methods (provider may define request on prototype).
  const wrappedEth = Object.create(eth) as EIP1193Provider
  wrappedEth.request = async (args: any): Promise<any> => {
    const result = await eth.request(args)
    if (args.method === 'eth_signTypedData_v4' && typeof result === 'string') {
      return unwrapSignature(result)
    }
    return result
  }

  return createWalletClient({
    account: address,
    chain: baseSepolia,
    transport: custom(wrappedEth),
  }).extend(publicActions)
}

/**
 * Re-check chain before each paid x402 call (user may have changed network after connect).
 */
export async function assertWalletOnBaseSepolia(): Promise<void> {
  if (!baseAccountProvider) {
    throw new Error('Connect Base Wallet first.')
  }
  await ensureBaseSepolia(baseAccountProvider as EIP1193Provider)
}

/** Human-readable chain for UI (e.g. after connect). */
export async function getWalletChainSummary(): Promise<{ chainIdHex: string; chainIdDec: number; ok: boolean }> {
  if (!baseAccountProvider) {
    return { chainIdHex: '', chainIdDec: 0, ok: false }
  }
  const hex = await readChainIdHex(baseAccountProvider as EIP1193Provider).catch(() => '')
  if (!hex) return { chainIdHex: '', chainIdDec: 0, ok: false }
  const dec = chainIdHexToDecimal(hex)
  return { chainIdHex: hex, chainIdDec: dec, ok: isBaseSepoliaChain(hex) }
}

export async function disconnectBaseWallet() {
  if (baseAccountProvider) {
    try {
      await baseAccountProvider.disconnect()
    } finally {
      baseAccountProvider = null
    }
  }
}
