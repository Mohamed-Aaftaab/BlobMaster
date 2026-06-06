import { NetworkConfig } from '../types'

/**
 * Network configuration for BlobMaster SDK.
 *
 * RPC endpoints powered by Tatum (https://tatum.io).
 * Set NEXT_PUBLIC_TATUM_API_KEY (or TATUM_API_KEY) in your environment.
 *
 * Deployed contract:
 *   PackageID: 0xa664fa704cf238fa6d87bc950bca4401c05ede372c42bd874eaefefe40dda2cf
 *   Network:   Sui Testnet (v1.73.1)
 *   Explorer:  https://testnet.suivision.xyz/package/0xa664fa704cf238fa6d87bc950bca4401c05ede372c42bd874eaefefe40dda2cf
 */

const TESTNET_PACKAGE_ID = '0x7bee1f8b45bb2fd8350f7a963be2b63f34602b73af36c57d2c3051590266e4ab'

// Walrus API endpoints are used directly.

// Tatum Sui RPC endpoints (https://tatum.io/tatum-x-walrus-hackathon)
const TATUM_TESTNET_RPC = 'https://sui-testnet.gateway.tatum.io'
const TATUM_MAINNET_RPC = 'https://sui-mainnet.gateway.tatum.io'
const PUBLIC_TESTNET_RPC = 'https://fullnode.testnet.sui.io:443'

const testnet: NetworkConfig = {
  blobMasterApiUrl:   'https://blobmaster-app.vercel.app',
  suiRpc:             process.env.NEXT_PUBLIC_TATUM_API_KEY ? `https://sui-testnet.gateway.tatum.io/?apiKey=${process.env.NEXT_PUBLIC_TATUM_API_KEY}` : PUBLIC_TESTNET_RPC,
  packageId:          TESTNET_PACKAGE_ID,
  priceOracleId:      '0x763f0c276f1fb8f6e58f59ffe5cdcf4b82e0d3e2d95d7d0e5aed351530a4be3d',
  walrusPublisher:    'https://publisher.walrus-testnet.walrus.space',
  walrusAggregator:   'https://aggregator.walrus-testnet.walrus.space',
}

const mainnet: NetworkConfig = {
  blobMasterApiUrl:   'https://blobmaster-app.vercel.app',
  suiRpc:             TATUM_MAINNET_RPC,
  packageId:          '0x0000000000000000000000000000000000000000000000000000000000000000', // deploy to mainnet
  walrusPublisher:    'https://publisher.walrus.space',
  walrusAggregator:   'https://aggregator.walrus.space',
}

const local: NetworkConfig = {
  blobMasterApiUrl:   'http://localhost:3000',
  suiRpc:             'http://localhost:9000',
  packageId:          '0x0000000000000000000000000000000000000000000000000000000000000000',
  walrusPublisher:    'http://localhost:31415',
  walrusAggregator:   'http://localhost:31415',
}

export function getNetworkConfig(network: 'testnet' | 'mainnet' | 'local'): NetworkConfig {
  switch (network) {
    case 'testnet': return testnet
    case 'mainnet': return mainnet
    case 'local':   return local
    default:        return testnet
  }
}
