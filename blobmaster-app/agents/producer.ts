import { agentStore, type Agent } from '@/lib/agent-state'
import { emitAgentEvent } from '@/lib/event-bus'

export function runProducer(agent: Agent, cycleMs: number, stopped: () => boolean): () => void {
  async function cycle() {
    while (!stopped()) {
      await sleep(cycleMs + jitter(1000))
      if (stopped()) break

      const a = agentStore.getAgent(agent.id)
      if (!a || a.state === 'dead') break

      // Simulate storing data on Walrus
      const bytes = Math.floor(Math.random() * 500_000) + 50_000
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
      let blobId = ''
      for (let i = 0; i < 43; i++) blobId += characters.charAt(Math.floor(Math.random() * characters.length))

      a.storedBytes += bytes
      a.txCount++
      a.earned += 0.003

      agentStore.listings.set(blobId, {
        agentId: a.id,
        pricePerRetrieve: '0.003',
        bytes,
      })
      a.activeBlobIds.push(blobId)

      await emitAgentEvent('agent:store', {
        agentId: a.id,
        blobId,
        bytes,
      })

      console.log(`[${a.id}] stored ${bytes}B blobId=${blobId.slice(0, 16)}`)
    }
  }

  cycle()
  return () => {}
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
function jitter(max: number) { return Math.floor(Math.random() * max) }
