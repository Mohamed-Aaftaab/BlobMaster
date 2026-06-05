import cron from 'node-cron'
import { autopilots, renewals } from '../lib/db'
import { getBlobStorageInfo, getCurrentEpoch, extendWalrusBlob } from '../lib/sui'

const EXTEND_EPOCHS = 30

async function checkAutopilotBlobs() {
  const active = await autopilots.listActive()
  if (active.length === 0) return

  console.log(`[cron] Checking ${active.length} autopilot blob(s)`)

  const currentEpoch = await getCurrentEpoch().catch(() => null)
  if (!currentEpoch) return

  for (const ap of active) {
    try {
      const info = await getBlobStorageInfo(ap.deal_id)
      const epochsLeft = info.endEpoch - currentEpoch

      if (epochsLeft < ap.renew_when_epochs_left) {
        console.log(`[cron] Extending blob ${ap.deal_id} (${epochsLeft} epochs left)`)

        const txHash = await extendWalrusBlob(ap.deal_id, EXTEND_EPOCHS)
        const newExpiryEpoch = info.endEpoch + EXTEND_EPOCHS

        await renewals.insert({
          deal_id: ap.deal_id,
          tx_hash: txHash,
          cost_usdc: '0.25',
          lighthouse_job_id: 'walrus_native',
          new_expiry_epoch: newExpiryEpoch,
        })

        if (ap.webhook_url) {
          await fireWebhook(ap.webhook_url, ap.webhook_secret, {
            event: 'blob.extended',
            blobId: ap.deal_id,
            txHash,
            costUsdc: '0.25',
            newExpiryEpoch,
            timestamp: new Date().toISOString(),
          }).catch(console.error)
        }
      }
    } catch (err) {
      console.error(`[cron] Error processing blob ${ap.deal_id}:`, err)
    }
  }
}

async function fireWebhook(url: string, secret: string | null, payload: object) {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (secret) {
    const { createHmac } = await import('crypto')
    headers['X-BlobMaster-Signature'] = createHmac('sha256', secret).update(body).digest('hex')
  }

  await fetch(url, { method: 'POST', headers, body })
}

export function startCron() {
  // Every 6 hours
  cron.schedule('0 */6 * * *', checkAutopilotBlobs)
  console.log('[cron] Autopilot monitor started (every 6 hours)')
}
