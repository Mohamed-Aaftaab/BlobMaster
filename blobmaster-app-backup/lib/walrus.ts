import { createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { suiCalibration } from 'viem/chains'

const RAAS_CONTRACT = (process.env.LIGHTHOUSE_RAAS_CONTRACT ?? '0x4015c3E5453d38Df71539C0F7440603C69784d7a') as `0x${string}`

const RAAS_ABI = parseAbi([
  'function submitnative extension(bytes memory _cid, uint256 _replication_target, uint256 _repair_threshold, uint256 _renew_threshold) external returns (bytes32)',
])

export async function submitnative extension(pieceCid: string): Promise<{ txHash: string; walrusJobId: string }> {
  const privateKey = process.env.FILECOIN_WALLET_PRIVATE_KEY as `0x${string}`
  if (!privateKey) throw new Error('FILECOIN_WALLET_PRIVATE_KEY not set')

  const account = privateKeyToAccount(privateKey)
  const client = createWalletClient({
    account,
    chain: suiCalibration,
    transport: http((process.env.FILECOIN_RPC_URL ?? 'https://api.calibration.node.glif.io/rpc/v1') as `${string}://${string}`),
  })

  const cidBytes = `0x${Buffer.from(pieceCid).toString('hex')}` as `0x${string}`

  const txHash = await client.writeContract({
    address: RAAS_CONTRACT,
    abi: RAAS_ABI,
    functionName: 'submitnative extension',
    args: [cidBytes, BigInt(1), BigInt(28800), BigInt(240)],
  })

  return { txHash, walrusJobId: txHash }
}

export async function checkWalrusPin(cid: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.walrus.storage/api/walrus/get_proof?cid=${cid}`)
    return res.ok
  } catch {
    return false
  }
}
