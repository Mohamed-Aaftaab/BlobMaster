export type AgentType = 'producer' | 'consumer' | 'guardian'
export type AgentState = 'alive' | 'critical' | 'dead'

export interface StoragePolicies {
  maxCostPerStoreUsdc: number
  minRedundancy: number
  defaultTTLDays: number
  pruneWhenBudgetPct: number
  maxStoredBytes: number
  retryOnFailure: number
}

export interface AgentVaultConfig {
  privateKey: `0x${string}`
  budget: string          // USDC starting budget e.g. '10'
  network: 'testnet' | 'mainnet'
  agentType: AgentType
  agentId?: string
  policies?: Partial<StoragePolicies>
  rpcUrl?: string
  agentBudgetContract?: `0x${string}`
}

export interface StoreOptions {
  ttl?: string            // e.g. '30d'
  redundancy?: number
  tag?: string
}

export interface DatasetListing {
  blobId: string
  agentId: string
  pricePerRetrieve: string  // USDC
  bytes: number
  tag?: string
}

export interface BudgetInfo {
  remaining: number
  total: number
  percentUsed: number
}

export interface StoreResult {
  blobId: string
  bytes: number
  txHash?: string
}
