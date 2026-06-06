'use client'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui.js/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@mysten/dapp-kit/dist/index.css'

// Use our absolute proxy URL so Tatum API keys are securely injected by the backend
const proxyUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : 'http://localhost:3000/api/rpc'

const { networkConfig } = createNetworkConfig({
  testnet: { url: proxyUrl, network: 'sui:testnet' },
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
