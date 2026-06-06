import { createX402Fetch } from './x402/client'
import { getNetworkConfig } from './config/networks'
import { validateBlobId, validateNetwork } from './utils/validators'
import {
  EPOCHS_PER_DAY,
  epochsToMs,
  msToEpochs,
  epochsToHuman,
  daysToEpochs,
  EPOCHS_PER_MONTH
} from './utils/epochs'
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client'
import {
  BlobNotFoundError,
  BlobExpiredError,
  PriceExceededError,
  BlobMasterError,
} from './errors'
import type {
  BlobMasterConfig,
  NetworkConfig,
  BlobStatus,
  ExtensionResult,
  ExtendOptions,
  AutopilotConfig,
  AutopilotRegistration,
  AutopilotStatus,
  BalanceResult,
  StoreOptions,
  StoreResult,
} from './types'

export class BlobMaster {
  // ── Static Utilities ────────────────────────────────────────────────────────
  static utils = {
    epochsToMs,
    msToEpochs,
    epochsToHuman,
    daysToEpochs,
    constants: {
      EPOCHS_PER_DAY,
      EPOCHS_PER_MONTH
    }
  }
  private readonly x402Fetch: ReturnType<typeof createX402Fetch>
  private readonly networkConfig: NetworkConfig
  private readonly suiRpc: string
  private readonly privateKey: `0x${string}` | undefined
  private readonly suiClient: SuiClient
  private readonly apiKey: string | undefined

  constructor(options: BlobMasterConfig) {
    const network = options.network ?? 'testnet'
    validateNetwork(network)

    this.networkConfig = getNetworkConfig(network)

    if (options.blobMasterApiUrl) {
      this.networkConfig = { ...this.networkConfig, blobMasterApiUrl: options.blobMasterApiUrl }
    }

    this.suiRpc = options.suiRpc ?? this.networkConfig.suiRpc
    this.privateKey = options.privateKey
    this.apiKey = options.apiKey

    this.suiClient = new SuiClient({ url: this.suiRpc })

    // Resolve x402 wallet: explicit override > privateKey shorthand
    const wallet = options.x402Wallet ?? (options.privateKey ? { privateKey: options.privateKey } : undefined)
    if (!wallet) throw new BlobMasterError('Provide privateKey or x402Wallet', 'INVALID_WALLET')
    this.x402Fetch = createX402Fetch(wallet, this.networkConfig.x402Network)
  }

  // ── Storage — Walrus ───────────────────────────────────────────────

  /**
   * ARCHITECTURAL DECISION:
   * We intentionally restrict direct data ingestion and extraction in the BlobMaster SDK.
   * Proxying massive data buffers through a middle-tier SDK is an anti-pattern that creates memory bottlenecks.
   * Developers should upload and download data directly via a native Walrus Publisher or Aggregator,
   * and then pass the resulting `blobId` to BlobMaster strictly for x402 lifecycle automation and renewals.
   * 
   * If you need deep storage integration inside a Node environment, see AgentVault.ts
   */
  async store(data: Buffer | Uint8Array | object, options?: StoreOptions): Promise<StoreResult> {
    throw new BlobMasterError(
      'Direct data ingestion is intentionally disabled in the SDK. Please upload directly to a Walrus Publisher and register the blobId here for renewals.',
      'NOT_IMPLEMENTED'
    )
  }

  /**
   * ARCHITECTURAL DECISION:
   * Direct retrieval is disabled. See the architectural note above store().
   */
  async retrieve(blobId: string): Promise<Buffer> {
    throw new BlobMasterError(
      'Direct data extraction is intentionally disabled in the SDK. Please download directly from a Walrus Aggregator using the blobId.',
      'NOT_IMPLEMENTED'
    )
  }

  // ── Free — queries Sui RPC / Walrus System directly, no payment ──────────────────────
  async getBlobStatus(blobId: string): Promise<BlobStatus> {
    validateBlobId(blobId)

    // In Walrus, you can read the blob object or query the system object.
    // For the hackathon, we assume the backend has an endpoint or we query Sui directly.
    // Let's query the BlobMaster API backend for simplicity, as it handles the complex SUI queries.
    const response = await fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/blobs/${blobId}/status`
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      if (error.code === 'BLOB_NOT_FOUND') {
        throw new BlobNotFoundError(blobId)
      }
      throw new BlobMasterError(error.message ?? 'Unknown error', error.code ?? 'UNKNOWN')
    }

    return response.json() as Promise<BlobStatus>
  }

  // ── x402-gated — $0.25 ETH per call ────────────────────────────────────────
  async extendBlob(blobId: string, opts: ExtendOptions = {}): Promise<ExtensionResult> {
    validateBlobId(blobId)

    const maxPriceETH = opts.maxPriceETH ?? 1.00
    const epochs = opts.epochs ?? 30 // extend for 30 epochs by default

    const response = await this.x402Fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/blobs/${blobId}/extend`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({ epochs }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      this.throwTypedError(error, blobId, maxPriceETH)
    }

    const result = await response.json() as ExtensionResult

    if (parseFloat(result.actualCostETH) > maxPriceETH) {
      throw new PriceExceededError(result.actualCostETH, String(maxPriceETH))
    }

    return result
  }

  /**
   * Register a Walrus blob with the BlobMaster Agent Network for autonomous lifecycle management.
   * Your blob will be continually monitored, and if its remaining epochs fall below the threshold,
   * an automated ETH payment will be dispatched to extend it.
   *
   * @param config - The configuration for the autopilot registration
   * @returns The autopilot registration details
   */
  async enableAutopilot(config: AutopilotConfig): Promise<AutopilotRegistration | AutopilotRegistration[]> {
    const blobIds = Array.isArray(config.blobId) ? config.blobId : [config.blobId]
    for (const id of blobIds) {
      validateBlobId(id)
    }

    const payload = {
      blobId: config.blobId,
      extendWhenEpochsLeft: config.extendWhenEpochsLeft ?? 10,
      maxPriceETH: config.maxPriceETH ?? 1.00,
      webhookUrl: config.webhookUrl,
      webhookSecret: config.webhookSecret,
    }

    const response = await this.x402Fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/autopilot`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      this.throwTypedError(error, Array.isArray(config.blobId) ? config.blobId[0] : config.blobId)
    }

    return response.json() as Promise<AutopilotRegistration | AutopilotRegistration[]>
  }

  // ── Free ────────────────────────────────────────────────────────────────────
  async disableAutopilot(blobId: string): Promise<{ disabled: boolean; blobId: string }> {
    validateBlobId(blobId)

    const response = await fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/autopilot/${blobId}`,
      { 
        method: 'DELETE',
        headers: {
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        }
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      this.throwTypedError(error, blobId)
    }

    return response.json()
  }

  // ── Free ────────────────────────────────────────────────────────────────────
  async getAutopilotStatus(blobId: string): Promise<AutopilotStatus> {
    validateBlobId(blobId)

    const response = await fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/autopilot/${blobId}`,
      {
        headers: {
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        }
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      this.throwTypedError(error, blobId)
    }

    return response.json() as Promise<AutopilotStatus>
  }

  // ── Free ────────────────────────────────────────────────────────────────────
  async getBalance(): Promise<BalanceResult> {
    const response = await fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/balance`,
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        } 
      }
    )

    if (!response.ok) {
      throw new BlobMasterError('Failed to fetch balance', 'BALANCE_FETCH_FAILED')
    }

    return response.json() as Promise<BalanceResult>
  }

  // ── Free ────────────────────────────────────────────────────────────────────
  async getAuditTrail(blobId: string): Promise<any> {
    validateBlobId(blobId)
    const response = await fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/audit?blobId=${blobId}`
    )
    if (!response.ok) {
      throw new BlobMasterError('Failed to fetch audit trail', 'AUDIT_FETCH_FAILED')
    }
    return response.json()
  }

  private throwTypedError(error: { code?: string; message?: string }, blobId?: string, maxPriceETH?: number): never {
    switch (error.code) {
      case 'BLOB_NOT_FOUND':
        throw new BlobNotFoundError(blobId ?? 'unknown')
      case 'BLOB_EXPIRED':
        throw new BlobExpiredError(blobId ?? 'unknown')
      case 'PRICE_EXCEEDED':
        throw new PriceExceededError(error.message ?? '?', String(maxPriceETH ?? '?'))
      default:
        throw new BlobMasterError(error.message ?? 'Unknown error', error.code ?? 'UNKNOWN')
    }
  }
}
