export const MIST_PER_SUI = 1_000_000_000n

export function mistToSui(mist: bigint): number {
  return Number(mist) / Number(MIST_PER_SUI)
}

export function suiToMist(sui: number): bigint {
  return BigInt(Math.round(sui * Number(MIST_PER_SUI)))
}

export function formatSui(mist: bigint, decimals = 4): string {
  return mistToSui(mist).toFixed(decimals)
}
