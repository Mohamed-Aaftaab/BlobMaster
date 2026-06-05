import { NextRequest, NextResponse } from 'next/server'
import { eventBus } from '@/lib/event-bus'
import { agentStore } from '@/lib/agent-state'
import type { AgentEvent } from '@/lib/event-bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const event = await req.json() as AgentEvent & { type: string }
  const ts = event.timestamp ?? Date.now()
  eventBus.emit(event.type, { ...event, timestamp: ts })

  const a = event.agentId ? agentStore.getAgent(event.agentId) : undefined

  if (event.type === 'agent:store' && event.agentId && event.cid != null) {
    if (a && event.bytes) a.storedBytes += event.bytes
    if (a) a.txCount++
    agentStore.addTransaction({
      timestamp: ts,
      from:      event.agentId,
      to:        'sui',
      amount:    0.008,
      type:      'store',
      cid:       event.cid,
    })
  }

  if (event.type === 'agent:pay' && event.from && event.to && event.amount != null) {
    const seller = agentStore.getAgent(event.to)
    if (seller) {
      seller.earned  += event.amount
      seller.budget  += event.amount * 0.9
      seller.txCount += 1
    }
    agentStore.addTransaction({
      timestamp: ts,
      from:      event.from,
      to:        event.to,
      amount:    event.amount,
      type:      'retrieve',
      cid:       event.cid,
    })
  }

  if (event.type === 'agent:repin' && event.agentId) {
    if (a) a.txCount++
    agentStore.addTransaction({
      timestamp: ts,
      from:      event.agentId,
      to:        'sui',
      amount:    typeof event.amount === 'number' ? event.amount : 0.005,
      type:      'repin',
      cid:       event.cid,
    })
  }

  if (event.type === 'agent:died' && event.agentId) {
    const ag = agentStore.getAgent(event.agentId)
    if (ag) {
      ag.state  = 'dead'
      ag.diedAt = ts
      if (event.finalBalance != null) ag.budget = event.finalBalance
    }
  }

  return NextResponse.json({ ok: true })
}
