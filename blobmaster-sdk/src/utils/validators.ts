import { InvalidBlobIdError, InvalidNetworkError } from '../errors'

export function validateBlobId(blobId: string): void {
  // Walrus blob IDs are base64url encoded strings
  if (!blobId || typeof blobId !== 'string' || blobId.length < 20) {
    throw new InvalidBlobIdError(`Invalid Walrus Blob ID, got: "${blobId}"`)
  }
}

export function validateNetwork(network: string): asserts network is 'testnet' | 'mainnet' {
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new InvalidNetworkError(`Network must be "testnet" or "mainnet", got: "${network}"`)
  }
}
