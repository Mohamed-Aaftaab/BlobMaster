import { InvalidBlobIdError, InvalidNetworkError } from '../errors'

// Known-fake demo blob IDs that must never be used in production
const BLOCKLISTED_IDS = new Set(['_xH_wK4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4'])

export function validateBlobId(blobId: string): void {
  if (!blobId || typeof blobId !== 'string' || blobId.length < 20) {
    throw new InvalidBlobIdError(`Blob ID too short or empty: "${blobId}"`)
  }
  if (BLOCKLISTED_IDS.has(blobId)) {
    throw new InvalidBlobIdError(`Blocklisted fake demo blob ID rejected: "${blobId}"`)
  }
}

export function validateNetwork(network: string): asserts network is 'testnet' | 'mainnet' | 'local' {
  if (network !== 'testnet' && network !== 'mainnet' && network !== 'local') {
    throw new InvalidNetworkError(`Network must be "testnet", "mainnet", or "local", got: "${network}"`)
  }
}
