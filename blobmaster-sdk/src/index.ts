export { BlobMaster } from './BlobMaster'
export { createX402Fetch } from './x402/client'
export type { X402Fetch } from './x402/client'
export type {
  BlobMasterConfig,
  BlobStatus,
  ExtensionResult,
  ExtendOptions,
  AutopilotConfig,
  AutopilotRegistration,
  AutopilotStatus,
  ExtensionRecord,
  BalanceResult,
  NetworkConfig,
  StoreOptions,
  StoreResult,
} from './types'
export {
  BlobMasterError,
  InsufficientUsdcError,
  PriceExceededError,
  X402PaymentError,
  BlobNotFoundError,
  BlobExpiredError,
  ExtensionFailedError,
  InvalidNetworkError,
  InvalidWalletError,
  InvalidBlobIdError,
} from './errors'
export {
  epochsToMs,
  msToEpochs,
  epochsToHuman,
  daysToEpochs,
  EPOCHS_PER_DAY,
  EPOCHS_PER_MONTH,
} from './utils/epochs'
export { NETWORKS, getNetworkConfig } from './config/networks'

/** Agent Vault runtime (demo / autonomous agents) — same package as the BlobMaster SDK. */
export { AgentVault } from './agent/AgentVault'
export { DEFAULT_POLICIES } from './agent/policies'
export type {
  AgentVaultConfig,
  AgentType,
  AgentState,
  StoragePolicies,
  DatasetListing,
  BudgetInfo,
} from './agent/agentTypes'
