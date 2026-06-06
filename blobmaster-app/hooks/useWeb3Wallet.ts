'use client'
import { useState, useEffect } from 'react'
import { createWalletClient, custom, parseEther, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'

export function useWeb3Wallet() {
  const [address, setAddress] = useState<Address | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletClient, setWalletClient] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const client = createWalletClient({
        chain: baseSepolia,
        transport: custom((window as any).ethereum)
      })
      setWalletClient(client);

      if (typeof (window as any).ethereum.on === 'function') {
        (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) setAddress(accounts[0] as Address)
          else setAddress(null)
        })
      }
      
      // Auto-reconnect if already approved
      if (typeof (window as any).ethereum.request === 'function') {
        (window as any).ethereum.request({ method: 'eth_accounts' })
          .then((accounts: any) => {
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0] as Address)
            }
          })
          .catch(() => {})
      }
    }
  }, [])

  const connect = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('No Web3 wallet found. Please install MetaMask or Coinbase Wallet.')
      return
    }
    
    setIsConnecting(true)
    setError(null)
    
    try {
      // Ensure we are on Base Sepolia
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${baseSepolia.id.toString(16)}` }],
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${baseSepolia.id.toString(16)}`,
              chainName: 'Base Sepolia',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org'],
            }],
          })
        } else {
          throw switchError
        }
      }

      const [addr] = await walletClient.requestAddresses()
      setAddress(addr)
    } catch (e: any) {
      setError(e.message ?? 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const sendPayment = async (toAddress: string, amountWeiHex: string): Promise<string> => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    
    // We send a native ETH transaction
    const txHash = await walletClient.sendTransaction({
      account: address,
      to: toAddress as Address,
      value: BigInt(amountWeiHex),
      chain: baseSepolia
    })
    
    return txHash
  }

  return { address, connect, isConnecting, error, sendPayment }
}
