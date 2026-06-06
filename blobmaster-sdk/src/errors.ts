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

export class InvalidBlobIdError extends BlobMasterError {
  constructor(message: string) {
    super(message, 'INVALID_BLOB_ID')
    this.name = 'InvalidBlobIdError'
  }
}
