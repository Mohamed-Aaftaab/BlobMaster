'use client'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui.js/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@mysten/dapp-kit/dist/index.css'

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet'), network: 'sui:testnet' },
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
