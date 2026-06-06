'use client'
import { useEffect } from 'react'

export interface AgentEvent {
  type:        string
  timestamp:   number
  agentId?:    string
  from?:       string
  to?:         string
  cid?:        string
  bytes?:      number
  amount?:     number
  reason?:     string
  finalBalance?: number
  remaining?:  number
  total?:      number
  blobId?:     string
  costUsdc?:   string
  basescanUrl?: string | null
  suivisionUrl?:  string | null
  status?:     string
}

export function useAgentEvents(onEvent: (e: AgentEvent) => void) {
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = (msg) => {
      try { onEvent(JSON.parse(msg.data)) } catch {}
    }
    es.onerror = () => {
      // SSE reconnects automatically
    }
    return () => es.close()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
