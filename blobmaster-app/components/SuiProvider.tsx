'use client'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui.js/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@mysten/dapp-kit/dist/index.css'

const tatumKey = process.env.NEXT_PUBLIC_TATUM_API_KEY ?? process.env.TATUM_API_KEY ?? ''
const testnetUrl = tatumKey 
  ? `https://sui-testnet.gateway.tatum.io/?apiKey=${tatumKey}`
  : 'https://testnet.sui.rpcpool.com/'

const { networkConfig } = createNetworkConfig({
  testnet: { url: testnetUrl, network: 'sui:testnet' },
  mainnet: { url: getFullnodeUrl('mainnet'), network: 'sui:mainnet' },
})

const queryClient = new QueryClient()

export function SuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
