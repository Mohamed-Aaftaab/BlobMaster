// Sui/Walrus epoch durations
// 1 Sui epoch = 24 hours (confirmed in Walrus docs and Sui system state)
export const EPOCH_DURATION_MS   = 24 * 60 * 60 * 1000  // 86_400_000 ms
export const EPOCHS_PER_DAY      = 1
export const EPOCHS_PER_WEEK     = 7
export const EPOCHS_PER_MONTH    = 30
export const EPOCHS_PER_YEAR     = 365

// Walrus storage deal constraints
export const MIN_DEAL_EPOCHS     = 1           // minimum 1 epoch
export const MAX_DEAL_EPOCHS     = 730         // ~2 years

/** Convert epochs to milliseconds */
export function epochsToMs(epochs: number): number {
  return epochs * EPOCH_DURATION_MS
}

/** Convert milliseconds to epochs (floor) */
export function msToEpochs(ms: number): number {
  return Math.floor(ms / EPOCH_DURATION_MS)
}

/** Convert days to epochs (1:1 since 1 epoch = 1 day) */
export function daysToEpochs(days: number): number {
  return Math.round(days * EPOCHS_PER_DAY)
}

/** Human-readable epoch duration */
export function epochsToHuman(epochs: number): string {
  if (epochs <= 0)   return 'expired'
  if (epochs === 1)  return '1 day'
  if (epochs < 7)    return `${epochs} days`
  if (epochs < 30)   return `${Math.round(epochs / 7)} weeks`
  if (epochs < 365)  return `${Math.round(epochs / 30)} months`
  return `${(epochs / 365).toFixed(1)} years`
}
