export const ATTOFIL_PER_FIL = 1_000_000_000_000_000_000n

export function attoFilToFil(attoFil: bigint): number {
  return Number(attoFil) / Number(ATTOFIL_PER_FIL)
}

export function filToAttoFil(fil: number): bigint {
  return BigInt(Math.round(fil * Number(ATTOFIL_PER_FIL)))
}

export function formatFil(attoFil: bigint, decimals = 4): string {
  return attoFilToFil(attoFil).toFixed(decimals)
}
