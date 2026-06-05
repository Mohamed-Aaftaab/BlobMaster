// 1 Filecoin epoch = 30 seconds
export const EPOCHS_PER_SECOND = 1 / 30
export const EPOCHS_PER_DAY = 2_880        // 86400 / 30
export const EPOCHS_PER_MONTH = 86_400     // 30 days
export const MIN_DEAL_DURATION = 518_400   // 6 months minimum
export const MAX_DEAL_DURATION = 1_555_200 // 18 months maximum

export function epochsToMs(epochs: number): number {
  return epochs * 30_000
}

export function msToEpochs(ms: number): number {
  return Math.floor(ms / 30_000)
}

export function daysToEpochs(days: number): number {
  return Math.round(days * EPOCHS_PER_DAY)
}

export function epochsToHuman(epochs: number): string {
  const totalSeconds = epochs * 30
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
