/** Agent runtime (`AgentVault` from `blobmaster-sdk`) shares the Calibration wallet with BlobMaster chain ops when unset. */
export function getAgentSuiPrivateKey(): `0x${string}` | undefined {
  const pk = process.env.FILECOIN_PRIVATE_KEY ?? process.env.FILECOIN_WALLET_PRIVATE_KEY
  if (!pk || !pk.startsWith('0x')) return undefined
  return pk as `0x${string}`
}
