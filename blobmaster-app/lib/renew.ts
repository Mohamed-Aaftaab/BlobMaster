import { getBlobStorageInfo, extendWalrusBlob } from '@/lib/sui'

/**
 * performRenewal — used by the Agent Economy simulation demo.
 *
 * NOTE: The Agent Economy page is a SIMULATION that visualises how
 * autonomous keeper agents would behave in production. It uses real
 * Walrus blob status checks but the on-chain renewal transaction
 * requires a real ruleId + vaultId pair registered via the dashboard.
 *
 * When ruleId/vaultId are provided (production keeper path), a genuine
 * Sui PTB is submitted and a real tx digest is returned.
 * When running without them (simulation path), no on-chain tx is sent.
 */
export async function performRenewal(
  blobId:   string,
  _payer  = 'demo',
  ruleId?:  string,
  vaultId?: string,
) {
  const blob = await getBlobStorageInfo(blobId)

  if (blob.status === 'expired') {
    throw Object.assign(new Error('Blob already expired'), { code: 'BLOB_EXPIRED', status: 422 })
  }

  const renewalEpochs = blob.renewalEpochs ?? 30

  if (ruleId && vaultId) {
    // ── Production path: real on-chain PTB via BlobMaster Move contract ──────
    const { txHash, keeper } = await extendWalrusBlob(blobId, ruleId, vaultId, renewalEpochs)
    const costMist = BigInt(renewalEpochs) * BigInt(300_000) // fair market ~300k MIST/epoch
    const actualCostSUI = (Number(costMist) / 1_000_000_000).toFixed(6)

    return {
      renewed:              true,
      simulation:           false,
      blobId,
      txHash,
      keeper,
      actualCostSUI,
      newExpiryEpoch:       blob.endEpoch + renewalEpochs,
      newExpiryDate:        new Date(Date.now() + renewalEpochs * 86_400_000).toISOString(),
      suivisionUrl:         txHash ? `https://testnet.suivision.xyz/txblock/${txHash}` : null,
    }
  }

  // ── Simulation path: no on-chain tx — demo only ───────────────────────────
  const estimatedCost = (renewalEpochs * 300_000 / 1_000_000_000).toFixed(6)
  return {
    renewed:       true,
    simulation:    true,   // ← explicit flag: this is a demo simulation, not a real tx
    blobId,
    txHash:        null,
    keeper:        null,
    actualCostSUI: estimatedCost,
    newExpiryEpoch: blob.endEpoch + renewalEpochs,
    newExpiryDate:  new Date(Date.now() + renewalEpochs * 86_400_000).toISOString(),
    suivisionUrl:  null,   // no real tx → no explorer link
  }
}
