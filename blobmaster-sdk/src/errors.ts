export class BlobMasterError extends Error {
  code: string
  details?: unknown

  constructor(message: string, code: string, details?: unknown) {
    super(message)
    this.name = 'BlobMasterError'
    this.code = code
    this.details = details
  }
}

// Payment errors
export class InsufficientETHError extends BlobMasterError {
  constructor(message = 'Wallet ETH balance is insufficient for extension') {
    super(message, 'INSUFFICIENT_ETH')
    this.name = 'InsufficientETHError'
  }
}

export class PriceExceededError extends BlobMasterError {
  actualCostETH: string
  maxPriceETH: string

  constructor(actualCostETH: string, maxPriceETH: string) {
    super(
      `Extension cost $${actualCostETH} ETH exceeds maxPriceETH $${maxPriceETH} ETH`,
      'PRICE_EXCEEDED'
    )
    this.name = 'PriceExceededError'
    this.actualCostETH = actualCostETH
    this.maxPriceETH = maxPriceETH
  }
}

export class NetworkTimeoutError extends BlobMasterError {
  constructor(message = 'Network request timed out') {
    super(message, 'NETWORK_TIMEOUT')
    this.name = 'NetworkTimeoutError'
  }
}

export class X402PaymentError extends BlobMasterError {
  constructor(message = 'x402 payment was rejected by the CDP facilitator', details?: unknown) {
    super(message, 'X402_PAYMENT_FAILED', details)
    this.name = 'X402PaymentError'
  }
}

// Walrus errors
export class BlobNotFoundError extends BlobMasterError {
  constructor(blobId: string) {
    super(`Blob ${blobId} not found on Walrus`, 'BLOB_NOT_FOUND')
    this.name = 'BlobNotFoundError'
  }
}

export class BlobExpiredError extends BlobMasterError {
  constructor(blobId: string) {
    super(`Blob ${blobId} has already expired and cannot be extended natively`, 'BLOB_EXPIRED')
    this.name = 'BlobExpiredError'
  }
}

export class ExtensionFailedError extends BlobMasterError {
  suiError: string

  constructor(suiError: string) {
    super(`Walrus contract reverted on SUI: ${suiError}`, 'EXTENSION_FAILED')
    this.name = 'ExtensionFailedError'
    this.suiError = suiError
  }
}

// Config errors
export class InvalidNetworkError extends BlobMasterError {
  constructor(message: string) {
    super(message, 'INVALID_NETWORK')
    this.name = 'InvalidNetworkError'
  }
}

export class InvalidWalletError extends BlobMasterError {
  constructor(message = 'Wallet cannot sign EIP-3009 USDC authorizations') {
    super(message, 'INVALID_WALLET')
    this.name = 'InvalidWalletError'
  }
}

export class InvalidBlobIdError extends BlobMasterError {
  constructor(message: string) {
    super(message, 'INVALID_BLOB_ID')
    this.name = 'InvalidBlobIdError'
  }
}
