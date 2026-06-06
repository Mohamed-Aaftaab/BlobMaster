import { agentStore, type Agent } from '@/lib/agent-state'
import { emitAgentEvent } from '@/lib/event-bus'
import { getAgentSuiPrivateKey } from '@/lib/agent-wallet'
import { getBlobFromChain } from '@/lib/sui'
import { performRenewal } from '@/lib/renew'

const SUIVISION   = 'https://testnet.suivision.xyz/tx'

export function runGuardian(agent: Agent, cycleMs: number, stopped: () => boolean): () => void {
  async function cycle() {
    const pk = getAgentSuiPrivateKey()
    if (!pk) {
      console.error('[guardian] Set BLOBMASTER_WALLET_PRIVATE_KEY (suiprivkey... or 0x hex)')
      return
    }

    while (!stopped()) {
      await sleep(cycleMs + jitter(5000))
      if (stopped()) break

      const a = agentStore.getAgent(agent.id)
      if (!a || a.state === 'dead') break

      // Get all listings that have a real Sui blob ID
      const blobs = Array.from(agentStore.listings.entries())
        .filter(([, meta]) => !!meta.blobId)
        .map(([id, meta]) => ({ blobId: id, actualBlobId: meta.blobId! }))

      if (blobs.length === 0) {
        console.log(`[${a.id}] No blobs with IDs yet — waiting for producers`)
      }

      for (const { blobId } of blobs) {
        try {
          const status = await getBlobFromChain(blobId)

          // Update listing status
          const listing = agentStore.listings.get(blobId)
          if (listing) {
            const listingStatus =
              status.status === 'active' || status.status === 'expiring' || status.status === 'expired'
                ? status.status
                : undefined
            agentStore.listings.set(blobId, { ...listing, status: listingStatus })
          }

          console.log(`[${a.id}] Blob ${blobId}: ${status.status}, ~${Math.round(status.daysUntilExpiry)}d left`)

          if (status.needsRenewal || status.status === 'expiring') {
            console.log(`[${a.id}] Renewing blob ${blobId} via BlobMaster x402…`)

            try {
              const result = await performRenewal(blobId, process.env.BLOBMASTER_WALLET_ADDRESS ?? a.id)
              const cost = parseFloat(result.actualCostSUI)

              agentStore.addTransaction({
                timestamp: Date.now(),
                from:      a.id,
                to:        'blobmaster',
                amount:    cost,
                type:      'pay',
                blobId,
              })

              a.txCount++
              a.budget -= cost

              console.log(`[${a.id}] Renewed blob ${blobId} — ${result.actualCostSUI} SUI`)
              if (result.txHash)        console.log(`  SuiVision:   ${SUIVISION}/${result.txHash}`)

              await emitAgentEvent('agent:renew', {
                agentId:        a.id,
                blobId,
                costSUI:       result.actualCostSUI,
                paymentTxHash:  null,
                suiTxHash: result.txHash ?? null,
                suivisionUrl:      result.txHash ? `${SUIVISION}/${result.txHash}` : null,
              })

            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e)
              console.error(`[${a.id}] renewBlob(${blobId}) failed:`, msg)
            }
          }

          await sleep(500)
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          console.warn(`[${a.id}] getBlobStatus(${blobId}) failed:`, msg)
        }
      }

      await emitAgentEvent('agent:budget', {
        agentId: a.id,
        remaining: a.budget,
        total: agent.budgetTotal,
      })

      if (a.budget <= 0) {
        a.state  = 'dead'
        a.diedAt = Date.now()
        await emitAgentEvent('agent:died', {
          agentId: a.id,
          finalBalance: 0,
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
