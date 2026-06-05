import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { autopilots, renewals } from '../lib/db'

export const autopilotRouter = Router()

// This route is protected by x402 middleware (applied in index.ts)
autopilotRouter.post('/', async (req: Request, res: Response) => {
  const { blobId, extendWhenEpochsLeft = 10, maxPriceUsdc = 1.00, webhookUrl, webhookSecret } = req.body

  if (!blobId || typeof blobId !== 'string' || blobId.length < 20) {
    return void res.status(400).json({ code: 'INVALID_BLOB_ID', message: 'blobId must be a valid Walrus Blob ID string' })
  }

  const id = `ap_${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const walletAddress = (req as any).x402PayerAddress ?? '0x0'

  await autopilots.upsert({ id, deal_id: blobId, wallet_address: walletAddress, renew_when_epochs_left: extendWhenEpochsLeft, max_price_usdc: maxPriceUsdc, webhook_url: webhookUrl ?? null, webhook_secret: webhookSecret ?? null })

  const nextCheckAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()

  res.json({
    autopilotId: id,
    blobId,
    monitoringActive: true,
    nextCheckAt,
    estimatedExtensionDate: nextCheckAt,
    webhookConfigured: !!webhookUrl,
  })
})

autopilotRouter.get('/:blobId', async (req: Request, res: Response) => {
  const { blobId } = req.params
  const ap = await autopilots.getByDealId(blobId)
  if (!ap) return void res.status(404).json({ code: 'NOT_FOUND', message: `No autopilot for blob ${blobId}` })

  const history = (await renewals.getByDealId(blobId)) as any[]

  res.json({
    blobId,
    monitoringActive: ap.active === 1,
    extensionHistory: history.map(r => ({
      epoch: r.new_expiry_epoch,
      txHash: r.tx_hash,
      costUsdc: r.cost_usdc,
      timestamp: r.timestamp,
    })),
    totalSpentUsdc: history.reduce((sum, r) => sum + parseFloat(r.cost_usdc ?? '0'), 0).toFixed(2),
    nextCheckAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  })
})

autopilotRouter.delete('/:blobId', async (req: Request, res: Response) => {
  const { blobId } = req.params
  await autopilots.disable(blobId)
  res.json({ disabled: true, blobId })
})
