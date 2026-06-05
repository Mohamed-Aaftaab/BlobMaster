import { agentStore, type Agent } from '@/lib/agent-state'
import { emitAgentEvent } from '@/lib/event-bus'

const MIN_BALANCE = 0.001

export function runConsumer(agent: Agent, cycleMs: number, stopped: () => boolean): () => void {
  async function cycle() {
    while (!stopped()) {
      await sleep(cycleMs + jitter(2000))
      if (stopped()) break

      const a = agentStore.getAgent(agent.id)
      if (!a || a.state === 'dead') break

      if (a.budget <= MIN_BALANCE) {
        a.state = 'dead'
        a.diedAt = Date.now()
        await emitAgentEvent('agent:died', {
          agentId: a.id,
          finalBalance: a.budget,
        })
        break
      }

      const listings = Array.from(agentStore.listings.entries()).map(([cid, l]) => ({ cid, ...l }))

      if (listings.length > 0) {
        const target = listings.sort((x, y) =>
          parseFloat(x.pricePerRetrieve) - parseFloat(y.pricePerRetrieve)
        )[0]

        const cost = parseFloat(target.pricePerRetrieve)

        if (a.budget >= cost) {
          a.budget -= cost
          a.txCount++

          const producer = agentStore.getAgent(target.agentId)
          if (producer) producer.earned += cost

          await emitAgentEvent('agent:pay', {
            from: a.id,
            to: target.agentId,
            amount: cost,
            cid: target.cid,
          })
        }
      }

      if (a.budget / a.budgetTotal < 0.20) a.state = 'critical'
      if (a.budget <= MIN_BALANCE) {
        a.state = 'dead'
        a.diedAt = Date.now()
        await emitAgentEvent('agent:died', {
          agentId: a.id,
          finalBalance: a.budget,
        })
        break
      }
    }
  }

  cycle()
  return () => {}
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function jitter(max: number) { return Math.floor(Math.random() * max) }