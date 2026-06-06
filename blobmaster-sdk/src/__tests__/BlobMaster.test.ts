import { describe, it, expect, beforeEach } from 'vitest'
import { BlobMaster } from '../BlobMaster'
import {
  BlobMasterError, BlobNotFoundError, ExtensionFailedError,
  InvalidNetworkError, InvalidBlobIdError,
} from '../errors'
import {
  epochsToMs, msToEpochs, epochsToHuman, daysToEpochs,
  EPOCH_DURATION_MS, EPOCHS_PER_DAY, EPOCHS_PER_MONTH,
} from '../utils/epochs'
import { validateBlobId, validateNetwork } from '../utils/validators'
import { getNetworkConfig } from '../config/networks'

// ── Error classes ─────────────────────────────────────────────────────────────
describe('Error classes', () => {
  it('BlobMasterError stores code and message', () => {
    const err = new BlobMasterError('something went wrong', 'TEST_CODE')
    expect(err.message).toBe('something went wrong')
    expect(err.code).toBe('TEST_CODE')
    expect(err.name).toBe('BlobMasterError')
    expect(err).toBeInstanceOf(Error)
  })

  it('BlobNotFoundError has correct code', () => {
    const err = new BlobNotFoundError('abc123')
    expect(err.code).toBe('BLOB_NOT_FOUND')
    expect(err.message).toContain('abc123')
  })

  it('ExtensionFailedError wraps suiError', () => {
    const err = new ExtensionFailedError('tx reverted')
    expect(err.code).toBe('EXTENSION_FAILED')
    expect(err.suiError).toBe('tx reverted')
  })

  it('InvalidNetworkError', () => {
    const err = new InvalidNetworkError('bad network')
    expect(err.code).toBe('INVALID_NETWORK')
  })

  it('InvalidBlobIdError', () => {
    const err = new InvalidBlobIdError('too short')
    expect(err.code).toBe('INVALID_BLOB_ID')
  })
})

// ── Epoch utilities ───────────────────────────────────────────────────────────
describe('Epoch utilities', () => {
  it('1 epoch = 24 hours (86_400_000 ms)', () => {
    expect(EPOCH_DURATION_MS).toBe(86_400_000)
  })

  it('EPOCHS_PER_DAY is 1', () => {
    expect(EPOCHS_PER_DAY).toBe(1)
  })

  it('EPOCHS_PER_MONTH is 30', () => {
    expect(EPOCHS_PER_MONTH).toBe(30)
  })

  it('daysToEpochs(30) === 30', () => {
    expect(daysToEpochs(30)).toBe(30)
  })

  it('daysToEpochs(1) === 1', () => {
    expect(daysToEpochs(1)).toBe(1)
  })

  it('epochsToMs(1) === 86_400_000 (1 day in ms)', () => {
    expect(epochsToMs(1)).toBe(86_400_000)
  })

  it('epochsToMs(30) === 2_592_000_000 (30 days)', () => {
    expect(epochsToMs(30)).toBe(2_592_000_000)
  })

  it('msToEpochs roundtrip', () => {
    const epochs = 10
    expect(msToEpochs(epochsToMs(epochs))).toBe(epochs)
  })

  it('epochsToHuman: 1 epoch = "1 day"', () => {
    expect(epochsToHuman(1)).toBe('1 day')
  })

  it('epochsToHuman: 7 epochs = "1 weeks"', () => {
    const result = epochsToHuman(7)
    expect(result).toContain('week')
  })

  it('epochsToHuman: 0 epochs = "expired"', () => {
    expect(epochsToHuman(0)).toBe('expired')
  })
})

// ── Validators ────────────────────────────────────────────────────────────────
describe('Validators', () => {
  it('validateNetwork does not throw for testnet/mainnet/local', () => {
    expect(() => validateNetwork('testnet')).not.toThrow()
    expect(() => validateNetwork('mainnet')).not.toThrow()
    expect(() => validateNetwork('local')).not.toThrow()
  })

  it('validateNetwork throws for EVM networks', () => {
    expect(() => validateNetwork('baseSepolia' as any)).toThrow()
    expect(() => validateNetwork('ethereum' as any)).toThrow()
  })

  it('validateBlobId accepts valid blob IDs', () => {
    expect(() => validateBlobId('A'.repeat(44))).not.toThrow()
    expect(() => validateBlobId('x'.repeat(32))).not.toThrow()
  })

  it('validateBlobId rejects short IDs', () => {
    expect(() => validateBlobId('short')).toThrow()
    expect(() => validateBlobId('')).toThrow()
  })

  it('validateBlobId rejects the fake demo ID', () => {
    expect(() => validateBlobId('_xH_wK4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4')).toThrow()
  })
})

// ── Network config ────────────────────────────────────────────────────────────
describe('Network config', () => {
  it('testnet uses public fallback RPC', () => {
    const cfg = getNetworkConfig('testnet')
    expect(cfg.suiRpc).toContain('fullnode.testnet.sui.io')
    expect(cfg.suiRpc).toContain('testnet')
  })

  it('mainnet uses Tatum RPC', () => {
    const cfg = getNetworkConfig('mainnet')
    expect(cfg.suiRpc).toContain('tatum.io')
    expect(cfg.suiRpc).toContain('mainnet')
  })

  it('testnet config has real deployed packageId', () => {
    const cfg = getNetworkConfig('testnet')
    expect(cfg.packageId).toMatch(/^0x[0-9a-f]{64}$/)
    expect(cfg.packageId).not.toBe('0x' + '0'.repeat(64))
  })

  it('testnet config has walrusPublisher and walrusAggregator', () => {
    const cfg = getNetworkConfig('testnet')
    expect(cfg.walrusPublisher).toContain('walrus')
    expect(cfg.walrusAggregator).toContain('walrus')
  })
})

// ── BlobMaster SDK class ──────────────────────────────────────────────────────
describe('BlobMaster SDK', () => {
  const bm = new BlobMaster({ network: 'testnet' })

  it('instantiates correctly', () => {
    expect(bm).toBeInstanceOf(BlobMaster)
  })

  it('exposes networkConfig', () => {
    expect(bm.networkConfig).toBeDefined()
    expect(bm.networkConfig.suiRpc).toContain('fullnode.testnet.sui.io')
    expect(bm.networkConfig.packageId).toBeTruthy()
  })

  it('exposes suiClient', () => {
    expect(bm.suiClient).toBeDefined()
  })

  it('createVaultTx returns a TransactionBlock', () => {
    const txb = bm.createVaultTx()
    expect(txb).toBeDefined()
    expect(txb).not.toBeNull()
  })

  it('depositTx accepts BigInt MIST', () => {
    const txb = bm.depositTx('0x1234', BigInt(5_000_000_000))
    expect(txb).toBeDefined()
  })

  it('depositSuiTx converts SUI to MIST correctly', () => {
    const txb = bm.depositSuiTx('0x1234', 1.5)
    expect(txb).toBeDefined()
  })

  it('withdrawTx accepts BigInt MIST', () => {
    const txb = bm.withdrawTx('0x1234', BigInt(1_000_000_000))
    expect(txb).toBeDefined()
  })

  it('withdrawSuiTx convenience method works', () => {
    const txb = bm.withdrawSuiTx('0x1234', 0.5)
    expect(txb).toBeDefined()
  })

  it('registerAutopilotTx handles a single blobId', () => {
    const txb = bm.registerAutopilotTx('0x1234', { blobId: 'A'.repeat(44), blobSizeBytes: BigInt(10000) })
    expect(txb).toBeDefined()
  })

  it('registerAutopilotTx handles batch blobIds', () => {
    const txb = bm.registerAutopilotTx('0x1234', { blobId: ['A'.repeat(44), 'B'.repeat(44)], blobSizeBytes: BigInt(10000) })
    expect(txb).toBeDefined()
  })

  it('registerAutopilotTx rejects invalid blobId', () => {
    expect(() => bm.registerAutopilotTx('0x1234', { blobId: 'bad', blobSizeBytes: BigInt(10000) })).toThrow()
  })

  it('deleteRuleTx returns a TransactionBlock', () => {
    const txb = bm.deleteRuleTx('0xrule', '0xvault')
    expect(txb).toBeDefined()
  })

  it('executeRenewalTx accepts BigInt', () => {
    const txb = bm.executeRenewalTx('0xrule', '0xvault', BigInt(9_000_000))
    expect(txb).toBeDefined()
  })

  it('executeTx throws without a keypair', async () => {
    const txb = bm.createVaultTx()
    await expect(bm.executeTx(txb)).rejects.toThrow('No Sui private key configured for signing')
  })
})
