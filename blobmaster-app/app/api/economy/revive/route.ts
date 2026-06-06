import { NextResponse } from 'next/server'
import { agentStore } from '@/lib/agent-state'
import { emitAgentEvent } from '@/lib/event-bus'

export async function POST(req: Request) {
  try {
    const { agentId } = await req.json()
    if (!agentId) return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })

    const agent = agentStore.getAgent(agentId)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    if (agent.state !== 'dead') {
      return NextResponse.json({ error: 'Agent is not dead' }, { status: 400 })
    }

    // Revive the agent
    agent.state = 'active' as any // Use 'alive' in agent-state but it's typed as 'alive' or 'critical' or 'dead'. Let's set 'alive'
    agent.state = 'alive'
    agent.budget += 50
    agent.hasBeenRevived = true
    delete agent.diedAt

    // We can emit a custom event to update the UI instantly if needed, or just let polling handle it.
    // Let's emit a 'pay' event from the 'sui' node to simulate a grant.
    emitAgentEvent('agent:pay', {
      agentId: 'sui',
      from: 'sui',
      to: agentId,
      amount: 50,
      timestamp: Date.now()
    })

    return NextResponse.json({ success: true, agent })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
