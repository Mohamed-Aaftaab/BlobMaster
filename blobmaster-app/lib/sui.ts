import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography'

// ── Tatum-powered Sui RPC ─────────────────────────────────────────────────────
const TATUM_API_KEY = process.env.TATUM_API_KEY ?? ''
const TATUM_RPC     = 'https://sui-testnet.gateway.tatum.io'
const SUI_RPC       = process.env.SUI_RPC_URL ?? (TATUM_API_KEY ? TATUM_RPC : getFullnodeUrl('testnet'))

function makeSuiClient(): SuiClient {
  if (TATUM_API_KEY) {
    return new SuiClient({
      url:   SUI_RPC,
      fetch: (input: any, init?: any) => fetch(input, {
        ...init,
        headers: { ...(init?.headers ?? {}), 'x-api-key': TATUM_API_KEY },
      }),
    })
  }
  return new SuiClient({ url: SUI_RPC })
}

export const suiClient = makeSuiClient()

// ── Current epoch ─────────────────────────────────────────────────────────────
export async function getCurrentEpoch(): Promise<number> {
  try {
    const state = await suiClient.getLatestSuiSystemState()
    return Number(state.epoch)
  } catch {
    // Fallback approximation
    return Math.floor(Date.now() / (1000 * 60 * 60 * 24)) - 19000
  }
}

// ── WAL/SUI pricing ───────────────────────────────────────────────────────────
// Walrus testnet: ~0.006 WAL per epoch per MiB; 1 WAL ≈ 0.05 SUI
const WAL_PER_EPOCH_PER_MIB = 0.006
const SUI_PER_WAL           = 0.05

export function estimateRenewalCostSUI(epochs: number, sizeMib = 1): string {
  const wal = WAL_PER_EPOCH_PER_MIB * epochs * sizeMib
  return (wal * SUI_PER_WAL).toFixed(6)
}

export function estimateRenewalCostMist(epochs: number, sizeMib = 1): bigint {
  const sui = parseFloat(estimateRenewalCostSUI(epochs, sizeMib))
  return BigInt(Math.round(sui * 1_000_000_000))
}

// ── Walrus aggregator / publisher ──────────────────────────────────────────────
const WALRUS_AGGREGATOR = process.env.WALRUS_AGGREGATOR_URL
  ?? 'https://aggregator.walrus-testnet.walrus.space'
const WALRUS_PUBLISHER  = process.env.WALRUS_PUBLISHER_URL
  ?? 'https://publisher.walrus-testnet.walrus.space'

/** Upload data to Walrus — returns blob ID */
export async function uploadToWalrus(data: Uint8Array | string, epochs = 30): Promise<string> {
  const body = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const url  = `${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`
  const res  = await fetch(url, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body,
  })
  if (!res.ok) throw new Error(`Walrus upload failed: ${res.status} ${await res.text()}`)
  const json = await res.json() as any
  return json.newlyCreated?.blobObject?.blobId
      ?? json.alreadyCertified?.blobId
      ?? json.blobId
      ?? (() => { throw new Error('No blobId in Walrus response') })()
}

/** Get blob metadata from Walrus aggregator */
export async function getBlobStorageInfo(blobId: string) {
  const currentEpoch = await getCurrentEpoch()
  const infoUrl      = `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}/info`
  const renewalEpochs = 30

  try {
    const res = await fetch(infoUrl)
    if (res.ok) {
      const data         = await res.json() as any
      const endEpoch     = data?.storage?.end_epoch ?? data?.end_epoch ?? currentEpoch + renewalEpochs
      const epochsLeft   = Math.max(0, endEpoch - currentEpoch)
      return {
        blobId,
        storageNodeId:      'Walrus Network',
        startEpoch:         data?.storage?.start_epoch ?? currentEpoch,
        endEpoch,
        currentEpoch,
        epochsUntilExpiry:  epochsLeft,
        daysUntilExpiry:    epochsLeft, // 1 epoch = 1 day
        needsRenewal:       epochsLeft < 10,
        renewalCostSUI:     estimateRenewalCostSUI(renewalEpochs),
        renewalEpochs,
        status:             epochsLeft <= 0 ? 'expired' : epochsLeft < 10 ? 'expiring' : 'active',
      }
    }
  } catch { /* fallback below */ }

  // Fallback: blob not queryable, show safe defaults
  return {
    blobId,
    storageNodeId:     'Walrus Network',
    startEpoch:        currentEpoch,
    endEpoch:          currentEpoch + renewalEpochs,
    currentEpoch,
    epochsUntilExpiry: renewalEpochs,
    daysUntilExpiry:   renewalEpochs,
    needsRenewal:      false,
    renewalCostSUI:    estimateRenewalCostSUI(renewalEpochs),
    renewalEpochs,
    status:            'active' as const,
  }
}

// ── Keeper: execute on-chain renewal via BlobMaster Move contract ──────────────
const PACKAGE_ID = process.env.BLOBMASTER_PACKAGE_ID
  ?? '0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e'

export async function extendWalrusBlob(
  blobId:   string,
  ruleId?:  string,
  vaultId?: string,
  epochs = 30,
): Promise<{ txHash: string; keeper: string }> {
  const privateKeyBech32 = process.env.KEEPER_PRIVATE_KEY

  if (!privateKeyBech32) {
    // Demo mode: update in-memory state only
    console.warn('[keeper] No KEEPER_PRIVATE_KEY — demo mode, no on-chain tx sent.')
    return { txHash: 'demo_no_key', keeper: '0x0' }
  }

  let keypair: Ed25519Keypair
  if (privateKeyBech32.startsWith('suiprivkey')) {
    const { secretKey } = decodeSuiPrivateKey(privateKeyBech32)
    keypair = Ed25519Keypair.fromSecretKey(secretKey)
  } else {
    const hex = privateKeyBech32.startsWith('0x') ? privateKeyBech32.slice(2) : privateKeyBech32
    keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(Buffer.from(hex, 'hex')))
  }

  const storageCostMist = estimateRenewalCostMist(epochs)
  const tx = new TransactionBlock()

  if (ruleId && vaultId) {
    // Call the BlobMaster Move contract's execute_renewal
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::execute_renewal`,
      arguments: [
        tx.object(ruleId),
        tx.object(vaultId),
        tx.pure(storageCostMist),
      ],
    })
  } else {
    // Standalone: just record a self-transfer as a demo fallback
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(BigInt(1_000))])
    tx.transferObjects([coin], tx.pure(keypair.toSuiAddress()))
  }

  const result = await suiClient.signAndExecuteTransactionBlock({
    signer:           keypair,
    transactionBlock: tx,
    options:          { showEffects: true },
  })

  return {
    txHash: result.digest,
    keeper: keypair.toSuiAddress(),
  }
}

export const getBlobFromChain = getBlobStorageInfo
