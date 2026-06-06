'use client'
import { useState } from 'react'
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { BlobMaster } from 'blobmaster-sdk'

const VAULT_ID = process.env.NEXT_PUBLIC_DEMO_VAULT_ID || '0x0000000000000000000000000000000000000000000000000000000000000001'

export default function DashboardPage() {
  const [blobId, setBlobId] = useState('')
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txResult, setTxResult] = useState<string | null>(null)

  const account = useCurrentAccount()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const bm = new BlobMaster({ network: 'testnet' })

  async function checkBlob() {
    const trimmed = blobId.trim()
    if (!trimmed) return setError('Enter a Blob ID')
    setLoading(true)
    setError(null)
    setStatus(null)
    setTxResult(null)
    try {
      const res = await fetch(`/api/blobs/${encodeURIComponent(trimmed)}/status`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch blob')
      setStatus(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function enableAutopilot() {
    if (!account) return setError('Connect your Sui Wallet first')
    const trimmed = blobId.trim()
    if (!trimmed) return setError('Enter a Blob ID first')
    setLoading(true)
    setError(null)
    try {
      const txb = bm.registerAutopilotTx(VAULT_ID, { blobId: trimmed })
      const res = await signAndExecuteTransaction({ transaction: txb as any })
      setTxResult(res.digest)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function depositToVault() {
    if (!account) return setError('Connect your Sui Wallet first')
    setLoading(true)
    setError(null)
    try {
      const txb = bm.depositTx(VAULT_ID, 1.5) // 1.5 SUI
      const res = await signAndExecuteTransaction({ transaction: txb as any })
      setTxResult(res.digest)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-transparent p-4 sm:p-8 text-slate-200">
      <div className="max-w-2xl mx-auto font-sans">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-white text-2xl font-semibold">BlobMaster</h1>
            <div className="text-neutral-400 text-xs mt-1">Non-custodial · Native Sui · Walrus Testnet</div>
          </div>
          <ConnectButton />
        </div>

        {/* Blob ID Input */}
        <div className="glass-panel p-5 mb-6 bg-white/[0.02]">
          <div className="text-[11px] text-slate-400 mb-2 uppercase tracking-widest font-semibold">Walrus Blob ID</div>
          <div className="flex gap-2">
            <input
              id="blob-id-input"
              value={blobId}
              onChange={e => setBlobId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkBlob()}
              placeholder="Paste a real Walrus blob ID (base64url)"
              className="flex-1 bg-black border border-[#333] rounded-lg px-4 py-2 text-white font-mono text-sm outline-none focus:border-amber-500/50 transition-all"
            />
            <button
              id="check-blob-btn"
              onClick={checkBlob}
              disabled={!blobId.trim() || loading}
              className="bg-amber-500 text-black px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition"
            >
              Check
            </button>
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="text-red-400 bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {loading && <div className="text-amber-400 mb-4 animate-pulse text-sm">Processing...</div>}

        {/* Tx confirmation */}
        {txResult && (
          <div className="glass-panel p-4 mb-6 bg-green-950/20 border border-green-900/30">
            <div className="text-green-400 text-sm font-semibold mb-1">✅ Transaction submitted on-chain</div>
            <a
              href={`https://testnet.suivision.xyz/txblock/${txResult}`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 font-mono text-xs hover:underline"
            >
              {txResult.slice(0, 20)}... ↗ SuiVision
            </a>
          </div>
        )}

        {/* Blob Status */}
        {status && !loading && (
          <div className="glass-panel p-5 mb-6 bg-white/[0.02]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[11px] text-slate-400 mb-1 uppercase tracking-widest">Blob ID</div>
                <div className="text-white text-sm font-mono bg-black border border-[#333] px-2 py-0.5 rounded inline-block truncate max-w-[280px]">
                  {status.blobId}
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold border uppercase ${
                status.status === 'active'
                  ? 'bg-neutral-900/50 border-neutral-800 text-neutral-300'
                  : status.status === 'expiring'
                  ? 'bg-amber-950/30 border-amber-900/50 text-amber-400'
                  : 'bg-red-950/30 border-red-900/50 text-red-500'
              }`}>{status.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <div className="text-[11px] text-slate-400 mb-1 uppercase tracking-widest">Epochs Left</div>
                <div className={`text-sm font-semibold ${status.epochsUntilExpiry < 5 ? 'text-amber-400' : 'text-neutral-300'}`}>
                  {status.epochsUntilExpiry} epochs (~{status.daysUntilExpiry} days)
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1 uppercase tracking-widest">Est. Renewal Cost</div>
                <div className="text-neutral-300 text-sm">{status.renewalCostSUI} SUI <span className="text-neutral-500 text-xs">(≈ WAL at market)</span></div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1 uppercase tracking-widest">Current Epoch</div>
                <div className="text-neutral-300 text-sm font-mono">{status.currentEpoch}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 mb-1 uppercase tracking-widest">Needs Renewal</div>
                <div className={`text-sm font-bold ${status.needsRenewal ? 'text-amber-400' : 'text-neutral-500'}`}>
                  {status.needsRenewal ? '⚠️ Yes' : 'No'}
                </div>
              </div>
            </div>

            <div className="border-t border-[#333] pt-4">
              <div className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-3">On-Chain Actions (requires Sui Wallet)</div>
              <div className="flex flex-wrap gap-2">
                <button
                  id="register-autopilot-btn"
                  onClick={enableAutopilot}
                  disabled={!account || loading}
                  className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition"
                >
                  Register Autopilot Rule (On-Chain)
                </button>
                <button
                  id="deposit-vault-btn"
                  onClick={depositToVault}
                  disabled={!account || loading}
                  className="border border-amber-500 text-amber-400 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-500 hover:text-black transition disabled:opacity-50"
                >
                  Deposit 1.5 SUI to Vault
                </button>
              </div>
              {!account && (
                <div className="text-neutral-500 text-xs mt-2">Connect your Sui Wallet above to sign transactions</div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
