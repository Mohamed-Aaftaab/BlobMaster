import { DEFAULT_POLICIES } from './policies'
import { walrus } from './walrus'
import type {
  AgentVaultConfig,
  AgentType,
  AgentState,
  StoragePolicies,
  StoreOptions,
  StoreResult,
  DatasetListing,
  BudgetInfo,
} from './agentTypes'

const MIN_BALANCE = 0.001  // USDC — die below this

export class AgentVault {
  readonly id:         string
  readonly agentType:  AgentType
  readonly policies:   StoragePolicies

  private privateKey:  string
  private rpcUrl:      string
  private _budget:     number
  private _budgetTotal:number
  private _state:      AgentState
  private _stored:     Map<string, { bytes: number; tag?: string }> = new Map()
  private _listings:   Map<string, { pricePerRetrieve: string }> = new Map()
  private _apiBase:    string

  constructor(config: AgentVaultConfig) {
    this.id          = config.agentId ?? `${config.agentType}-${Date.now().toString(36)}`
    this.agentType   = config.agentType
    this.privateKey  = config.privateKey
    this.rpcUrl      = config.rpcUrl ?? 'https://sui-testnet.gateway.tatum.io'
    this._budget     = parseFloat(config.budget)
    this._budgetTotal= parseFloat(config.budget)
    this._state      = 'alive'
    this.policies    = { ...DEFAULT_POLICIES, ...config.policies }
    this._apiBase    = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:3000'
  }

  // ── Core lifecycle ──────────────────────────────────────────────────

  async store(data: Buffer | Uint8Array | object, options?: StoreOptions): Promise<StoreResult> {
    this._requireAlive()
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data))

    if (buf.length > this.policies.maxStoredBytes) {
      throw new Error(`Data exceeds maxStoredBytes (${this.policies.maxStoredBytes})`)
    }

    const epochs = options?.ttl ? Number(options.ttl) : 5
    const blobId = await walrus.store(buf, epochs)
    const bytes = buf.length
    this._stored.set(blobId, { bytes, tag: options?.tag })
    await this._emitEvent('agent:store', { agentId: this.id, blobId, bytes })
    return { blobId, bytes }
  }

  async retrieve(blobId: string): Promise<Buffer> {
    this._requireAlive()
    const listing = await this._fetchListing(blobId)
    if (listing) {
      const cost = parseFloat(listing.pricePerRetrieve)
      await this._charge(cost, `retrieve:${blobId}`)
      await this._emitEvent('agent:pay', {
        from: this.id,
        to:   listing.agentId,
        amount: cost,
        reason: 'retrieve',
      })
    }
    return walrus.retrieve(blobId)
  }

  async renew(blobId: string): Promise<void> {
    this._requireAlive()
    await this._charge(0.005, `renew:${blobId}`)
  }

  async prune(blobId: string): Promise<void> {
    // Walrus blobs auto-expire; no explicit delete needed.
    this._stored.delete(blobId)
    this._listings.delete(blobId)
    await this._emitEvent('agent:prune', { agentId: this.id, blobId })
  }

  async pruneAll(): Promise<void> {
    for (const blobId of this._stored.keys()) {
      await this.prune(blobId).catch(() => {})
    }
  }

  // ── Agent economy ───────────────────────────────────────────────────

  async announce(blobId: string, pricing: { pricePerRetrieve: string }): Promise<void> {
    this._listings.set(blobId, pricing)
    await this._emitEvent('agent:announce', {
      agentId: this.id,
      blobId,
      pricePerRetrieve: pricing.pricePerRetrieve,
    })
  }

  async discover(): Promise<DatasetListing[]> {
    try {
      const res = await fetch(`${this._apiBase}/api/listings`)
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async canAfford(price: string | number): Promise<boolean> {
    return this._budget >= parseFloat(String(price)) + MIN_BALANCE
  }

  async collectRevenue(): Promise<number> {
    // Revenue is tracked server-side; this fetches accumulated amount
    try {
      const res = await fetch(`${this._apiBase}/api/agents/${this.id}/revenue`, { method: 'POST' })
      if (!res.ok) return 0
      const { amount } = await res.json()
      this._budget += amount
      return amount
    } catch {
      return 0
    }
  }

  async chargeRescue(blobId: string, fee: number): Promise<void> {
    await this._charge(fee, `rescue:${blobId}`)
    await this._emitEvent('agent:pay', {
      from: this.id,
      to:   'guardian',
      amount: fee,
      reason: 'rescue',
    })
  }

  // ── Availability ────────────────────────────────────────────────────

  async checkAvailability(blobId: string): Promise<boolean> {
    try {
      await walrus.retrieve(blobId)
      return true
    } catch {
      return false
    }
  }

  async extend(blobId: string): Promise<void> {
    // For Walrus, we would typically extend the blob on Sui
    await this._emitEvent('agent:extend', { agentId: this.id, blobId, success: true })
  }

  async getWatchList(): Promise<string[]> {
    return Array.from(this._stored.keys())
  }

  // ── Budget management ────────────────────────────────────────────────

  async getBudget(): Promise<BudgetInfo> {
    return {
      remaining:   this._budget,
      total:       this._budgetTotal,
      percentUsed: ((this._budgetTotal - this._budget) / this._budgetTotal) * 100,
    }
  }

  isAlive(): boolean {
    return this._state !== 'dead'
  }

  getState(): AgentState {
    return this._state
  }

  async die(): Promise<void> {
    this._state = 'dead'
    await this.pruneAll()
    await this._emitEvent('agent:died', { agentId: this.id, finalBalance: this._budget })
  }

  // ── Private ─────────────────────────────────────────────────────────

  private _requireAlive() {
    if (this._state === 'dead') throw new Error(`Agent ${this.id} is dead`)
  }

  private async _charge(amount: number, reason: string): Promise<void> {
    if (this._budget < amount) {
      await this.die()
      throw new Error(`Agent ${this.id} ran out of budget`)
    }
    this._budget -= amount
    if (this._budget / this._budgetTotal < (this.policies.pruneWhenBudgetPct / 100)) {
      this._state = 'critical'
    }
    if (this._budget <= MIN_BALANCE) {
      await this.die()
    }
  }

  private async _fetchListing(blobId: string): Promise<DatasetListing | null> {
    try {
      const res = await fetch(`${this._apiBase}/api/listings/${blobId}`)
      if (!res.ok) return null
      return res.json()
    } catch {
      return null
    }
  }

  private async _emitEvent(type: string, payload: object): Promise<void> {
    try {
      await fetch(`${this._apiBase}/api/events/emit`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, ...payload, timestamp: Date.now() }),
      })
    } catch {
      // Best-effort — event emission never blocks the agent
    }
  }
}
