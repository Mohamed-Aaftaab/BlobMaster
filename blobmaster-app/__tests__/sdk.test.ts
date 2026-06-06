import { BlobMaster } from 'blobmaster-sdk'

describe('BlobMaster SDK', () => {
  it('should initialize with testnet config', () => {
    const bm = new BlobMaster({ network: 'testnet' })
    expect(bm).toBeDefined()
    expect(bm.networkConfig.packageId).toBeTruthy()
  })

  it('should correctly expose BlobMaster as a class', () => {
    expect(typeof BlobMaster).toBe('function')
  })
})
