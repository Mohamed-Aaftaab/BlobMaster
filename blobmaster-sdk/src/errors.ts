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
export class InsufficientUsdcError extends BlobMasterError {
  constructor(message = 'Wallet USDC balance is insufficient for extension') {
    super(message, 'INSUFFICIENT_USDC')
    this.name = 'InsufficientUsdcError'
  }
}

export class PriceExceededError extends BlobMasterError {
  actualCostUsdc: string
  maxPriceUsdc: string

  constructor(actualCostUsdc: string, maxPriceUsdc: string) {
    super(
      `Extension cost $${actualCostUsdc} USDC exceeds maxPriceUsdc $${maxPriceUsdc} USDC`,
      'PRICE_EXCEEDED'
    )
    this.name = 'PriceExceededError'
    this.actualCostUsdc = actualCostUsdc
    this.maxPriceUsdc = maxPriceUsdc
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
