import { NetworkConfig } from '../types'

/**
 * Network configuration for BlobMaster SDK.
 *
 * RPC endpoints powered by Tatum (https://tatum.io).
 * Set NEXT_PUBLIC_TATUM_API_KEY (or TATUM_API_KEY) in your environment.
 *
 * Deployed contract:
 *   PackageID: 0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e
 *   Network:   Sui Testnet (v1.73.1)
 *   Explorer:  https://testnet.suivision.xyz/package/0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e
 */

const TESTNET_PACKAGE_ID = '0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e'

// Walrus system objects (aggregator-provided, used for extend_blob)
const WALRUS_TESTNET_SYSTEM_OBJ = '0x6c2547cbbc38025cf3adac45f63cb9a8e3e7b74c4bd80def84d99f37ccee29b7'
const WALRUS_MAINNET_SYSTEM_OBJ = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc4b5838694'

// Tatum Sui RPC endpoints (https://tatum.io/tatum-x-walrus-hackathon)
const TATUM_TESTNET_RPC = 'https://sui-testnet.gateway.tatum.io'
const TATUM_MAINNET_RPC = 'https://sui-mainnet.gateway.tatum.io'

const testnet: NetworkConfig = {
  blobMasterApiUrl:   'https://testnet.blobmaster.io',
  suiRpc:             TATUM_TESTNET_RPC,
  packageId:          TESTNET_PACKAGE_ID,
  walrusSystemObj:    WALRUS_TESTNET_SYSTEM_OBJ,
  walrusPublisher:    'https://publisher.walrus-testnet.walrus.space',
  walrusAggregator:   'https://aggregator.walrus-testnet.walrus.space',
}

const mainnet: NetworkConfig = {
  blobMasterApiUrl:   'https://blobmaster.io',
  suiRpc:             TATUM_MAINNET_RPC,
  packageId:          '0x0000000000000000000000000000000000000000000000000000000000000000', // deploy to mainnet
  walrusSystemObj:    WALRUS_MAINNET_SYSTEM_OBJ,
  walrusPublisher:    'https://publisher.walrus.space',
  walrusAggregator:   'https://aggregator.walrus.space',
}

const local: NetworkConfig = {
  blobMasterApiUrl:   'http://localhost:3000',
  suiRpc:             'http://localhost:9000',
  packageId:          '0x0000000000000000000000000000000000000000000000000000000000000000',
  walrusSystemObj:    '0x0000000000000000000000000000000000000000000000000000000000000005',
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
