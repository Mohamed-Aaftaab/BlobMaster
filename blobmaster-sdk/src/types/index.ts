export interface BlobMasterConfig {
  network?:      'testnet' | 'mainnet' | 'local'
  blobMasterApiUrl?: string
  suiRpc?:       string
  tatumApiKey?:  string   // Tatum API key (get one free at dashboard.tatum.io)
  suiPrivateKey?: string  // bech32 suiprivkey... or hex — used for server-side signing only
  suiClient?:    any
}

export interface AutopilotConfig {
  blobId:                string | string[]
  renewWhenEpochsLeft?:  number   // default 10 epochs (~10 days)
  epochsToAdd?:          number   // default 30 epochs (~30 days)
  maxPricePerEpoch?:     number   // MIST, default 1_000_000 (0.001 SUI)
  keeperReward?:         number   // MIST, default 1_000_000 (0.001 SUI)
  webhookUrl?:           string   // optional POST callback on renewal
}

export interface NetworkConfig {
  blobMasterApiUrl:  string
  suiRpc:            string
  packageId:         string
  walrusSystemObj:   string
  walrusPublisher:   string   // Walrus HTTP publisher endpoint
  walrusAggregator:  string   // Walrus HTTP aggregator endpoint
}

export interface WalrusBlobInfo {
  blobId:           string
  endEpoch:         number
  currentEpoch:     number
  epochsUntilExpiry: number
  status:           'active' | 'expiring' | 'expired'
  needsRenewal:     boolean
}
