/**
 * In-memory agent state store — source of truth for the dashboard graph.
 * Persists across requests in the same Node.js process.
 */

export type AgentType  = 'producer' | 'consumer' | 'guardian'
export type AgentState = 'alive' | 'critical' | 'dead'

export interface Agent {
  id:           string
  type:         AgentType
  state:        AgentState
  budget:       number
  budgetTotal:  number
  storedBytes:  number
  txCount:      number
  earned:       number
  bornAt:       number
  diedAt?:      number
  activeBlobIds:   string[]
  hasBeenRevived?: boolean
}

export interface Transaction {
  id:        string
  timestamp: number
  from:      string
  to:        string
  amount:    number
  type:      'store' | 'retrieve' | 'extend' | 'pay' | 'prune'
  blobId?:   string
}

class AgentStateStore {
  agents:       Map<string, Agent>       = new Map()
  transactions: Transaction[]            = []
  listings:     Map<string, { agentId: string; pricePerRetrieve: string; bytes: number; blobId?: string; status?: 'active' | 'expiring' | 'expired' }> = new Map()
  running:      boolean                  = false

  reset() {
    this.agents.clear()
    this.transactions = []
    this.listings.clear()
    this.running = false
  }

  addAgent(agent: Agent) {
    this.agents.set(agent.id, agent)
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id)
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  addTransaction(tx: Omit<Transaction, 'id'>) {
    const full = { ...tx, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}` }
    this.transactions.unshift(full)
    if (this.transactions.length > 200) this.transactions.pop()
    
    // Periodically prune expired or excess listings to prevent memory leaks
    if (this.transactions.length % 50 === 0) {
      this.pruneListings()
    }
    
    return full
  }

  pruneListings() {
    let deleted = 0
    for (const [key, value] of this.listings.entries()) {
      if (value.status === 'expired') {
        this.listings.delete(key)
        deleted++
      }
    }
    // Hard cap at 5000 to be extremely safe
    if (this.listings.size > 5000) {
      const keysToDelete = Array.from(this.listings.keys()).slice(0, this.listings.size - 5000)
      for (const k of keysToDelete) this.listings.delete(k)
    }
  }

  getStats() {
    const agents = this.getAllAgents()
    return {
      alive:          agents.filter(a => a.state !== 'dead').length,
      dead:           agents.filter(a => a.state === 'dead').length,
      critical:       agents.filter(a => a.state === 'critical').length,
      totalETH:     this.transactions.reduce((s, t) => s + t.amount, 0),
      totalStoredBytes: agents.reduce((s, a) => s + a.storedBytes, 0),
      txCount:        this.transactions.length,
    }
  }
}

const globalForStore = globalThis as unknown as { agentStore: AgentStateStore | undefined }
export const agentStore: AgentStateStore =
  globalForStore.agentStore ?? new AgentStateStore()
if (process.env.NODE_ENV !== 'production') globalForStore.agentStore = agentStore

/** Blobs listed by producers (excludes BlobMaster blob placeholders). */
export function getWatchedBlobIds(): string[] {
  return Array.from(agentStore.listings.entries())
    .filter(([, meta]) => !meta.blobId)
    .map(([blobId]) => blobId)
}
