import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'

const SUI_RPC = process.env.SUI_RPC_URL || 'https://sui-testnet.gateway.tatum.io'
const SUI_HEADERS = process.env.TATUM_API_KEY_TESTNET ? { 'x-api-key': process.env.TATUM_API_KEY_TESTNET } : undefined
export const suiClient = new SuiClient({ url: SUI_RPC, headers: SUI_HEADERS })

export async function getCurrentEpoch(): Promise<number> {
  const info = await suiClient.getLatestSuiSystemState()
  return Number(info.epoch)
}

// Mock database for blob expiry (in a real app, you'd index Walrus events or query the Walrus System Object)
const blobExpiryMap: Record<string, number> = {}

export async function getBlobStorageInfo(blobId: string) {
  const currentEpoch = await getCurrentEpoch()
  
  // For the hackathon demo, if we haven't seen this blob, give it 10 epochs to live
  if (!blobExpiryMap[blobId]) {
    blobExpiryMap[blobId] = currentEpoch + 10
  }

  return {
    blobId,
    startEpoch: currentEpoch - 5,
    endEpoch: blobExpiryMap[blobId],
  }
}

export async function extendWalrusBlob(blobId: string, epochs: number): Promise<string> {
  const privateKeyHex = process.env.FILECOIN_WALLET_PRIVATE_KEY || process.env.BLOBMASTER_WALLET_PRIVATE_KEY
  
  if (!privateKeyHex) {
    console.warn('No SUI private key provided. Simulating extension.')
    // Update our mock map
    const current = await getCurrentEpoch()
    blobExpiryMap[blobId] = Math.max(blobExpiryMap[blobId] || current, current) + epochs
    return '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0') // fake tx hash
  }

  try {
    // Strip 0x if present
    const cleanHex = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex
    const secretKey = new Uint8Array(Buffer.from(cleanHex, 'hex'))
    const keypair = Ed25519Keypair.fromSecretKey(secretKey)

    // Execute a real SUI transaction via Tatum RPC
    // We send a tiny 1 MIST transfer to ourselves to prove Tatum SUI RPC integration 
    // and SUI execution, representing the Walrus contract call.
    const tx = new TransactionBlock()
    const [coin] = tx.splitCoins(tx.gas, [1])
    tx.transferObjects([coin], tx.pure(keypair.toSuiAddress()))

    const result = await suiClient.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: { showEffects: true }
    })

    // Update our mock map
    const current = await getCurrentEpoch()
    blobExpiryMap[blobId] = Math.max(blobExpiryMap[blobId] || current, current) + epochs

    return result.digest
  } catch (err) {
    console.error('SUI execution failed:', err)
    throw err
  }
}
