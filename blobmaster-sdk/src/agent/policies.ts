import type { StoragePolicies } from './agentTypes'

export const DEFAULT_POLICIES: StoragePolicies = {
  maxCostPerStoreUsdfc:  0.10,
  minRedundancy:         2,
  defaultTTLDays:        30,
  pruneWhenBudgetPct:    10,
  maxStoredBytes:        100_000_000,
  retryOnFailure:        3,
}
