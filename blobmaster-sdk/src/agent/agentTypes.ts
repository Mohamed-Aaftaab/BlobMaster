export type AgentType = 'producer' | 'consumer' | 'guardian'
export type AgentState = 'alive' | 'critical' | 'dead'

export interface StoragePolicies {
  maxCostPerStoreUsdfc: number
  minRedundancy: number
  defaultTTLDays: number
  pruneWhenBudgetPct: number
  maxStoredBytes: number
  retryOnFailure: number
}

export interface AgentVaultConfig {
  privateKey: `0x${string}`
  budget: string          // USDFC starting budget e.g. '10'
  network: 'calibration' | 'mainnet'
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
  cid: string
  agentId: string
  pricePerRetrieve: string  // USDFC
  bytes: number
  tag?: string
}

export interface BudgetInfo {
  remaining: number
  total: number
  percentUsed: number
}

export interface StoreResult {
  cid: string
  bytes: number
  txHash?: string
}
