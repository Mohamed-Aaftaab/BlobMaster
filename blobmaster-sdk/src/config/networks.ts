import type { NetworkConfig } from '../types'

export const NETWORKS = {
  testnet: {
    suiRpc: 'https://sui-testnet.gateway.tatum.io',
    blobMasterApiUrl: 'https://api.testnet.blobmaster.xyz',
    walrusSystemObjectId: '0x0000000000000000000000000000000000000000000000000000000000000005',
    x402Network: 'base-sepolia',
    ETHAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    explorerUrl: 'https://testnet.suivision.xyz',
    basescanUrl: 'https://sepolia.basescan.org',
    chainId: 9000,
  },
  mainnet: {
    suiRpc: 'https://sui-mainnet.gateway.tatum.io',
    blobMasterApiUrl: 'https://api.blobmaster.xyz',
    walrusSystemObjectId: '0x0000000000000000000000000000000000000000000000000000000000000005',
    x402Network: 'base',
    ETHAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorerUrl: 'https://suivision.xyz',
    basescanUrl: 'https://basescan.org',
    chainId: 314,
  },
} as const satisfies Record<string, NetworkConfig>

export function getNetworkConfig(network: 'testnet' | 'mainnet'): NetworkConfig {
  return NETWORKS[network]
}
