import { createX402Fetch } from './x402/client'
import { getNetworkConfig } from './config/networks'
import { validateBlobId, validateNetwork } from './utils/validators'
import { EPOCHS_PER_DAY } from './utils/epochs'
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
  private readonly x402Fetch: ReturnType<typeof createX402Fetch>
  private readonly networkConfig: NetworkConfig
  private readonly suiRpc: string
  private readonly privateKey: `0x${string}` | undefined
  private readonly suiClient: SuiClient

  constructor(options: BlobMasterConfig) {
    const network = options.network ?? 'testnet'
    validateNetwork(network)

    this.networkConfig = getNetworkConfig(network)

    if (options.blobMasterApiUrl) {
      this.networkConfig = { ...this.networkConfig, blobMasterApiUrl: options.blobMasterApiUrl }
    }

    this.suiRpc = options.suiRpc ?? this.networkConfig.suiRpc
    this.privateKey = options.privateKey

    this.suiClient = new SuiClient({ url: this.suiRpc })

    // Resolve x402 wallet: explicit override > privateKey shorthand
    const wallet = options.x402Wallet ?? (options.privateKey ? { privateKey: options.privateKey } : undefined)
    if (!wallet) throw new BlobMasterError('Provide privateKey or x402Wallet', 'INVALID_WALLET')
    this.x402Fetch = createX402Fetch(wallet, this.networkConfig.x402Network)
  }

  // ── Storage — Walrus ───────────────────────────────────────────────

  /**
   * Upload data to Walrus. Returns blobId and byte count.
   * Note: In a real implementation, you'd use the Walrus publisher endpoint here.
   */
  async store(data: Buffer | Uint8Array | object, options?: StoreOptions): Promise<StoreResult> {
    if (!this.privateKey) throw new BlobMasterError('privateKey required for store()', 'INVALID_WALLET')
    
    // Placeholder for Walrus upload logic (typically requires SUI to pay for epochs)
    // Walrus publishers accept PUT requests
    throw new BlobMasterError('Not implemented - use Walrus Publisher directly', 'NOT_IMPLEMENTED')
  }

  /**
   * Download data from Walrus by BlobId.
   */
  async retrieve(blobId: string): Promise<Buffer> {
    throw new BlobMasterError('Not implemented - use Walrus Aggregator directly', 'NOT_IMPLEMENTED')
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

  // ── x402-gated — $0.25 USDC per call ────────────────────────────────────────
  async extendBlob(blobId: string, opts: ExtendOptions = {}): Promise<ExtensionResult> {
    validateBlobId(blobId)

    const maxPriceUsdc = opts.maxPriceUsdc ?? 1.00
    const epochs = opts.epochs ?? 30 // extend for 30 epochs by default

    const response = await this.x402Fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/blobs/${blobId}/extend`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochs }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      this.throwTypedError(error, blobId, maxPriceUsdc)
    }

    const result = await response.json() as ExtensionResult

    if (parseFloat(result.actualCostUsdc) > maxPriceUsdc) {
      throw new PriceExceededError(result.actualCostUsdc, String(maxPriceUsdc))
    }

    return result
  }

  // ── x402-gated — $0.10 USDC to register ────────────────────────────────────
  async enableAutopilot(config: AutopilotConfig): Promise<AutopilotRegistration> {
    validateBlobId(config.blobId)

    const payload = {
      blobId: config.blobId,
      extendWhenEpochsLeft: config.extendWhenEpochsLeft ?? 10,
      maxPriceUsdc: config.maxPriceUsdc ?? 1.00,
      webhookUrl: config.webhookUrl,
      webhookSecret: config.webhookSecret,
    }

    const response = await this.x402Fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/autopilot`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      this.throwTypedError(error, config.blobId)
    }

    return response.json() as Promise<AutopilotRegistration>
  }

  // ── Free ────────────────────────────────────────────────────────────────────
  async disableAutopilot(blobId: string): Promise<{ disabled: boolean; blobId: string }> {
    validateBlobId(blobId)

    const response = await fetch(
      `${this.networkConfig.blobMasterApiUrl}/api/autopilot/${blobId}`,
      { method: 'DELETE' }
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
      `${this.networkConfig.blobMasterApiUrl}/api/autopilot/${blobId}`
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
      { headers: { 'Content-Type': 'application/json' } }
    )

    if (!response.ok) {
      throw new BlobMasterError('Failed to fetch balance', 'BALANCE_FETCH_FAILED')
    }

    return response.json() as Promise<BalanceResult>
  }

  private throwTypedError(error: { code?: string; message?: string }, blobId?: string, maxPriceUsdc?: number): never {
    switch (error.code) {
      case 'BLOB_NOT_FOUND':
        throw new BlobNotFoundError(blobId ?? 'unknown')
      case 'BLOB_EXPIRED':
        throw new BlobExpiredError(blobId ?? 'unknown')
      case 'PRICE_EXCEEDED':
        throw new PriceExceededError(error.message ?? '?', String(maxPriceUsdc ?? '?'))
      default:
        throw new BlobMasterError(error.message ?? 'Unknown error', error.code ?? 'UNKNOWN')
    }
  }
}
