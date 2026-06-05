import { Router, Request, Response } from 'express'
import { getBlobStorageInfo, getCurrentEpoch, extendWalrusBlob } from '../lib/sui'
import { renewals } from '../lib/db'

export const blobsRouter = Router()

blobsRouter.get('/:blobId/status', async (req: Request, res: Response) => {
  const { blobId } = req.params

  try {
    const currentEpoch = await getCurrentEpoch()
    const info = await getBlobStorageInfo(blobId)

    const epochsUntilExpiry = info.endEpoch - currentEpoch
    // Let's say 1 SUI epoch is roughly 24h for demonstration, or whatever the Walrus epoch time is
    const daysUntilExpiry = epochsUntilExpiry 

    let status: string
    if (currentEpoch > info.endEpoch) status = 'expired'
    else if (epochsUntilExpiry < 5) status = 'expiring'
    else status = 'active'

    res.json({
      blobId,
      startEpoch: info.startEpoch,
      endEpoch: info.endEpoch,
      currentEpoch,
      epochsUntilExpiry,
      daysUntilExpiry,
      needsExtension: epochsUntilExpiry < 5,
      extensionCostUsdc: '0.25',
      status,
    })
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      return void res.status(404).json({ code: 'BLOB_NOT_FOUND', message: `Blob ${blobId} not found` })
    }
    res.status(500).json({ code: 'RPC_ERROR', message: err.message })
  }
})

// This route is protected by x402 middleware (applied in index.ts)
blobsRouter.post('/:blobId/extend', async (req: Request, res: Response) => {
  const { blobId } = req.params
  const { epochs } = req.body

  try {
    const currentEpoch = await getCurrentEpoch()
    const info = await getBlobStorageInfo(blobId)

    if (currentEpoch > info.endEpoch) {
      return void res.status(410).json({ code: 'BLOB_EXPIRED', message: `Blob ${blobId} has expired` })
    }

    const extendEpochs = epochs ?? 30

    // Submit to SUI / Walrus
    const txHash = await extendWalrusBlob(blobId, extendEpochs)

    const newExpiryEpoch = info.endEpoch + extendEpochs
    const newExpiryDate = new Date(Date.now() + extendEpochs * 86400_000).toISOString()

    // Record in DB
    await renewals.insert({
      deal_id: blobId, // DB column might still be deal_id, we just store blobId
      tx_hash: txHash,
      cost_usdc: '0.25',
      lighthouse_job_id: 'walrus_native',
      new_expiry_epoch: newExpiryEpoch,
    })

    res.json({
      extended: true,
      blobId,
      txHash,
      paymentTxHash: (req as any).x402PaymentTxHash ?? '',
      actualCostUsdc: '0.25',
      newExpiryEpoch,
      newExpiryDate,
      suiVisionUrl: `https://testnet.suivision.xyz/txblock/${txHash}`,
      basescanUrl: `https://sepolia.basescan.org/tx/${(req as any).x402PaymentTxHash ?? ''}`,
    })
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      return void res.status(404).json({ code: 'BLOB_NOT_FOUND', message: `Blob ${blobId} not found` })
    }
    res.status(500).json({ code: 'EXTENSION_FAILED', message: err.message })
  }
})
