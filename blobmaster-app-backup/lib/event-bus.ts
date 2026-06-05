import { EventEmitter } from 'events'

export interface AgentEvent {
  type:      string
  timestamp: number
  agentId?:  string
  from?:     string
  to?:       string
  cid?:      string
  bytes?:    number
  amount?:   number
  reason?:   string
  finalBalance?: number
  success?:  boolean
  remaining?: number
  total?:    number
  // Blob renewal fields
  blobId?:        string
  costUsdc?:      string
  paymentTxHash?: string | null
  suiTxHash?: string | null
  basescanUrl?:   string | null
  suivisionUrl?:     string | null
  status?:        string
}

class AgentEventBus extends EventEmitter {
  private history: AgentEvent[] = []

  emit(event: string, payload: AgentEvent): boolean {
    this.history.unshift(payload)
    if (this.history.length > 200) this.history.pop()
    return super.emit(event, payload)
  }

  getHistory(limit = 50): AgentEvent[] {
    return this.history.slice(0, limit)
  }
}

// Singleton — persists across hot reloads in dev
const globalForBus = globalThis as unknown as { agentEventBus: AgentEventBus | undefined }
export const eventBus: AgentEventBus =
  globalForBus.agentEventBus ?? new AgentEventBus()
if (process.env.NODE_ENV !== 'production') globalForBus.agentEventBus = eventBus

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  'http://localhost:3000'

type EmitPayload = Omit<AgentEvent, 'type' | 'timestamp'> & { timestamp?: number }

export async function emitAgentEvent(
  type: AgentEvent['type'],
  payload: EmitPayload,
): Promise<void> {
  const ts = payload.timestamp ?? Date.now()
  const full: AgentEvent = { ...(payload as AgentEvent), type, timestamp: ts }

  // Emit locally for any in-process listeners (history, logs)
  eventBus.emit(type, full)

  // Bridge across processes to the central event bus/API
  try {
    await fetch(`${APP_URL}/api/events/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(full),
    })
  } catch {
    // Best-effort only; UI should still work when in same process
  }
}
