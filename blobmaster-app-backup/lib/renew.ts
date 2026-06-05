import { getBlobStorageInfo, extendWalrusBlob } from '@/lib/sui'

export const MIN_DEAL_DURATION = 518_400

export async function performRenewal(blobId: string, payerAddress = 'demo') {
  const blob = await getBlobStorageInfo(blobId)

  if (blob.status === 'expired') {
    throw Object.assign(new Error('Blob already expired'), { code: 'BLOB_EXPIRED', status: 422 })
  }

  const { walrusJobId, txHash } = await extendWalrusBlob(blobId)
  const currentEpoch = blob.endEpoch - (blob.epochsUntilExpiry ?? 0)

  try {
    const { prisma } = await import('@/lib/db')
    if (prisma) {
      await prisma.renewalHistory.create({
        data: {
          blobId,
          txHash: txHash,
          walrusJobId,
          receiptCid: null,
          epochAtRenewal: currentEpoch,
        },
      })
    }
  } catch (e: any) {
    console.warn('[db] Skipped:', e.message)
  }

  const suivisionBase = 'https://suivision.xyz/txblock'

  return {
    renewed: true,
    blobId,
    txHash: txHash,
    raasTxHash: txHash,
    registryTxHash: txHash,
    actualCostUsdc: '0.001',
    newExpiryEpoch: blob.endEpoch + 10,
    newExpiryDate: new Date(Date.now() + 10 * 30_000).toISOString(),
    suivisionUrl: `${suivisionBase}/${txHash}`,
    registryFilfoxUrl: `${suivisionBase}/${txHash}`,
    walrusJobId,
    receiptCid: null,
    receiptUrl: null,
  }
}