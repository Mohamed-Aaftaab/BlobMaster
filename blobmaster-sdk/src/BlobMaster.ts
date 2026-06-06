import { getNetworkConfig } from './config/networks'
import { validateBlobId, validateNetwork } from './utils/validators'
import { SuiClient } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography'
import { BlobMasterError } from './errors'
import type { BlobMasterConfig, NetworkConfig, AutopilotConfig, WalrusBlobInfo, AutopilotRuleEvent } from './types'

export class BlobMaster {
  public readonly networkConfig: NetworkConfig
  public readonly suiClient: SuiClient
  private readonly keypair?: Ed25519Keypair
  private readonly tatumApiKey?: string

  constructor(options: BlobMasterConfig) {
    const network = options.network ?? 'testnet'
    validateNetwork(network)
    this.networkConfig = getNetworkConfig(network)
    this.tatumApiKey   = options.tatumApiKey

    this.suiClient = new SuiClient({
      url: this.networkConfig.suiRpc,
      ...(this.tatumApiKey ? {
        transport: new SuiHTTPTransport({
          url: this.networkConfig.suiRpc,
          fetch: (input: any, init?: any) => fetch(input, {
            ...init,
            headers: {
              ...(init?.headers ?? {}),
              'x-api-key': this.tatumApiKey!,
            },
          }),
        }),
      } : {}),
    })

    if (options.suiPrivateKey) {
      this.keypair = this._parseKeypair(options.suiPrivateKey)
    }
  }

  /** Parse a suiprivkey... bech32 or raw hex private key */
  private _parseKeypair(key: string): Ed25519Keypair {
    if (key.startsWith('suiprivkey')) {
      const { secretKey } = decodeSuiPrivateKey(key)
      return Ed25519Keypair.fromSecretKey(secretKey)
    }
    const hex = key.startsWith('0x') ? key.slice(2) : key
    return Ed25519Keypair.fromSecretKey(new Uint8Array(Buffer.from(hex, 'hex')))
  }

  // ── PTB Builders ─────────────────────────────────────────────────────────────

  public createVaultTx(): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this.networkConfig.packageId}::vault::create_vault`,
      arguments: [],
    })
    return txb
  }

  public depositTx(vaultId: string, amountMist: bigint): TransactionBlock {
    const txb = new TransactionBlock()
    const [coin] = txb.splitCoins(txb.gas, [txb.pure(amountMist)])
    txb.moveCall({
      target: `${this.networkConfig.packageId}::vault::deposit`,
      arguments: [txb.object(vaultId), coin],
    })
    return txb
  }

  /** Convenience: deposit using SUI amount (e.g. 1.5 SUI) — converts precisely to MIST */
  public depositSuiTx(vaultId: string, amountSui: number): TransactionBlock {
    const mist = BigInt(Math.round(amountSui * 1_000_000_000))
    return this.depositTx(vaultId, mist)
  }

  public withdrawTx(vaultId: string, amountMist: bigint): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this.networkConfig.packageId}::vault::withdraw`,
      arguments: [txb.object(vaultId), txb.pure(amountMist)],
    })
    return txb
  }

  /** Convenience: withdraw using SUI amount */
  public withdrawSuiTx(vaultId: string, amountSui: number): TransactionBlock {
    const mist = BigInt(Math.round(amountSui * 1_000_000_000))
    return this.withdrawTx(vaultId, mist)
  }

  public registerAutopilotTx(vaultId: string, config: AutopilotConfig): TransactionBlock {
    const txb    = new TransactionBlock()
    const blobIds = Array.isArray(config.blobId) ? config.blobId : [config.blobId]

    const renewEpochs = config.renewWhenEpochsLeft ?? 10
    const epochsToAdd = config.epochsToAdd         ?? 30
    const maxPrice    = config.maxPricePerEpoch     ?? 1_000_000
    const reward      = config.keeperReward         ?? 1_000_000
    const webhookUrl  = config.webhookUrl           ?? ''
    const blobSizeBytes = config.blobSizeBytes

    for (const blobIdStr of blobIds) {
      validateBlobId(blobIdStr)
      txb.moveCall({
        target: `${this.networkConfig.packageId}::vault::register_autopilot`,
        arguments: [
          txb.object(vaultId),
          txb.pure(blobIdStr),
          txb.pure(renewEpochs),
          txb.pure(epochsToAdd),
          txb.pure(maxPrice),
          txb.pure(reward),
          txb.pure(webhookUrl),
          txb.pure(blobSizeBytes, 'u64'),
          txb.object('0x6'), // Clock object
        ],
      })
    }
    return txb
  }

  public deleteRuleTx(ruleId: string, vaultId: string): TransactionBlock {
    const txb = new TransactionBlock()
    txb.moveCall({
      target: `${this.networkConfig.packageId}::vault::delete_rule`,
      arguments: [txb.object(ruleId), txb.object(vaultId)],
    })
    return txb
  }

  public executeRenewalTx(ruleId: string, vaultId: string, requestedRewardMist: bigint): TransactionBlock {
    const txb = new TransactionBlock()
    const oracleId = this.networkConfig.priceOracleId
    if (!oracleId) throw new Error('PriceOracle ID not configured for this network.')
    
    txb.moveCall({
      target: `${this.networkConfig.packageId}::vault::execute_renewal`,
      arguments: [
        txb.object(oracleId),
        txb.object(ruleId),
        txb.object(vaultId),
        txb.pure(requestedRewardMist, 'u64'),
        txb.object('0x6'), // Clock object
      ],
    })
    return txb
  }

  // ── Read methods ─────────────────────────────────────────────────────────────

  /** Get all Vault objects owned by an address */
  public async getVaults(owner: string): Promise<any[]> {
    const resp = await this.suiClient.getOwnedObjects({
      owner,
      filter: { StructType: `${this.networkConfig.packageId}::vault::Vault` },
      options: { showContent: true },
    })
    return resp.data.map(d => d.data)
  }

  /** Query on-chain RuleCreated events to find all rules for a vault */
  public async getRulesForVault(vaultId: string): Promise<AutopilotRuleEvent[]> {
    const events = await this.suiClient.queryEvents({
      query: { MoveEventType: `${this.networkConfig.packageId}::vault::RuleCreated` },
      limit: 100,
    })
    return events.data
      .map(e => e.parsedJson as any)
      .filter(j => {
        const id = j?.vault_id;
        return (typeof id === 'string' ? id : id?.bytes) === vaultId;
      })
  }

  /** Query all RuleCreated events (for keepers) */
  public async getAllRules(limit = 1000): Promise<AutopilotRuleEvent[]> {
    const rules: AutopilotRuleEvent[] = []
    let hasNextPage = true
    let cursor: string | null = null

    while (hasNextPage && rules.length < limit) {
      const events = await this.suiClient.queryEvents({
        query: { MoveEventType: `${this.networkConfig.packageId}::vault::RuleCreated` },
        cursor: cursor ? { txDigest: cursor, eventSeq: '0' } : undefined,
        limit: Math.min(50, limit - rules.length),
      })
      
      for (const e of events.data) {
        rules.push(e.parsedJson as AutopilotRuleEvent)
      }
      
      hasNextPage = events.hasNextPage
      cursor = events.data[events.data.length - 1]?.id?.txDigest ?? null
    }

    return rules
  }

  /** Check blob status from the Walrus aggregator */
  public async getBlobInfo(blobId: string): Promise<WalrusBlobInfo> {
    const url = `${this.networkConfig.walrusAggregator}/v1/blobs/${blobId}/info`
    try {
      const res  = await fetch(url)
      if (res.ok) {
        const data = await res.json() as any
        // Walrus REST API returns: { blob_id, registered_epoch, certified_epoch, end_epoch, ... }
        const currentEpoch     = await this._getCurrentEpoch()
        const endEpoch         = data.storage?.end_epoch ?? data.end_epoch ?? currentEpoch + 10
        const epochsUntilExpiry = Math.max(0, endEpoch - currentEpoch)
        return {
          blobId,
          endEpoch,
          currentEpoch,
          epochsUntilExpiry,
          status:       epochsUntilExpiry <= 0 ? 'expired' : epochsUntilExpiry < 10 ? 'expiring' : 'active',
          needsRenewal: epochsUntilExpiry < 10,
        }
      }
    } catch { /* fallback below */ }

    // Fallback: query Sui chain for current epoch and assume blob is active
    const currentEpoch = await this._getCurrentEpoch()
    return {
      blobId,
      endEpoch:          currentEpoch + 30,
      currentEpoch,
      epochsUntilExpiry: 30,
      status:            'active',
      needsRenewal:      false,
    }
  }

  /** Upload a blob to Walrus via HTTP publisher — returns blob ID */
  public async uploadBlob(data: Uint8Array | string, epochs = 30): Promise<string> {
    const rawBody = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const body    = rawBody.buffer.slice(rawBody.byteOffset, rawBody.byteOffset + rawBody.byteLength) as BodyInit
    const url     = `${this.networkConfig.walrusPublisher}/v1/blobs?epochs=${epochs}`
    const res     = await fetch(url, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body,
    })
    if (!res.ok) {
      throw new BlobMasterError(`Walrus upload failed: ${res.status} ${res.statusText}`, 'UPLOAD_FAILED')
    }
    const json = await res.json() as any
    // Walrus API returns { newlyCreated: { blobObject: { blobId } } } or { alreadyCertified: { blobId } }
    return json.newlyCreated?.blobObject?.blobId
        ?? json.alreadyCertified?.blobId
        ?? json.blobId
        ?? (() => { throw new BlobMasterError('Could not extract blobId from Walrus response', 'UPLOAD_FAILED') })()
  }

  // ── Execution ─────────────────────────────────────────────────────────────────

  public async executeTx(txb: TransactionBlock): Promise<any> {
    if (!this.keypair) {
      throw new BlobMasterError('No Sui private key configured for signing', 'NO_SIGNER')
    }
    return this.suiClient.signAndExecuteTransactionBlock({
      signer:           this.keypair,
      transactionBlock: txb,
      options:          { showEffects: true, showEvents: true },
    })
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async _getCurrentEpoch(): Promise<number> {
    try {
      const state = await this.suiClient.getLatestSuiSystemState()
      return Number(state.epoch)
    } catch {
      return Math.floor(Date.now() / (1000 * 60 * 60 * 24)) - 19000 // approximate Sui epoch
    }
  }
}
