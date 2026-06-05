import type { WalletClient } from 'viem'

export interface StoreOptions {
  epochs?: number
  redundancy?: number
  tag?: string
}

export interface StoreResult {
  blobId: string
  bytes: number
}

export interface BlobMasterConfig {
  /** EOA private key — used for both x402 USDC payments and SUI/Walrus storage ops */
  privateKey?: `0x${string}`
  /** Explicit x402 wallet override. Defaults to { privateKey } when privateKey is set. */
  x402Wallet?: WalletClient | { privateKey: `0x${string}` }
  network?: 'testnet' | 'mainnet'
  blobMasterApiUrl?: string
  suiRpc?: string
}

export interface BlobStatus {
  blobId: string
  endEpoch: number
  currentEpoch: number
  epochsUntilExpiry: number
  daysUntilExpiry: number
  needsExtension: boolean
  extensionCostUsdc: string
  status: 'active' | 'expiring' | 'expired'
}

export interface ExtensionResult {
  extended: boolean
  blobId: string
  txHash: string
  paymentTxHash: string
  actualCostUsdc: string
  newExpiryEpoch: number
  newExpiryDate: string
  suiVisionUrl: string
  basescanUrl: string
}

export interface ExtendOptions {
  maxPriceUsdc?: number
  epochs?: number
}

export interface AutopilotConfig {
  blobId: string
  extendWhenEpochsLeft?: number
  maxPriceUsdc?: number
  webhookUrl?: string
  webhookSecret?: string
}

export interface AutopilotRegistration {
  autopilotId: string
  blobId: string
  monitoringActive: boolean
  nextCheckAt: string
  estimatedExtensionDate: string
  webhookConfigured: boolean
}

export interface ExtensionRecord {
  epoch: number
  txHash: string
  costUsdc: string
  timestamp: string
}

export interface AutopilotStatus {
  blobId: string
  monitoringActive: boolean
  extensionHistory: ExtensionRecord[]
  totalSpentUsdc: string
  nextCheckAt: string
}

export interface NetworkConfig {
  suiRpc: string
  blobMasterApiUrl: string
  walrusSystemObjectId: string
  x402Network: string
  usdcAddress: string
  explorerUrl: string
  basescanUrl: string
  chainId: number
}

export interface BalanceResult {
  usdc: string
  address: string
  network: string
}
