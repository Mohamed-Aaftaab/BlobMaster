/**
 * Returns the agent's Sui private key from env.
 * Supports both bech32 (suiprivkey...) and hex (0x...) formats,
 * matching the same formats accepted by keeper.ts.
 */
export function getAgentSuiPrivateKey(): string | undefined {
  const pk = process.env.BLOBMASTER_WALLET_PRIVATE_KEY
  if (!pk) return undefined
  // Accept both bech32 suiprivkey... and 0x hex formats
  if (pk.startsWith('suiprivkey') || pk.startsWith('0x') || /^[0-9a-f]{64}$/i.test(pk)) {
    return pk
  }
  return undefined
}
