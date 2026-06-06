'use client'
import { useState, useEffect } from 'react'
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { BlobMaster } from 'blobmaster-sdk'

const bm = new BlobMaster({ network: 'testnet' })

export default function DashboardPage() {
  const [blobId, setBlobId]       = useState('')
  const [status, setStatus]       = useState<any>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [txResult, setTxResult]   = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [file, setFile]           = useState<File | null>(null)

  // Vault state — loaded from chain, not hardcoded
  const [vaults, setVaults]         = useState<any[]>([])
  const [selectedVault, setSelectedVault] = useState<string>('')
  const [loadingVaults, setLoadingVaults] = useState(false)

  // Optimization Profile state
  const [profile, setProfile] = useState<'saver' | 'balanced' | 'premium'>('balanced')

  const account = useCurrentAccount()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  // Load user's vaults whenever wallet connects
  useEffect(() => {
    if (!account?.address) { setVaults([]); setSelectedVault(''); return }
    setLoadingVaults(true)
    bm.getVaults(account.address)
      .then(v => {
        setVaults(v)
        if (v.length > 0) setSelectedVault(v[0]?.objectId ?? '')
      })
      .catch(() => setVaults([]))
      .finally(() => setLoadingVaults(false))
  }, [account?.address])

  // ── Telemetry Helper ────────────────────────────────────────────────────────
  function reportError(type: string, message: string) {
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'frontend', type, message })
    }).catch(() => {})
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function createVault() {
    if (!account) return setError('Connect your Sui Wallet first')
    setLoading(true); setError(null); setTxResult(null)
    try {
      const txb = new Transaction()
      txb.moveCall({
        target: `${bm.networkConfig.packageId}::vault::create_vault`,
        arguments: [],
      })
      const res = await signAndExecuteTransaction({ transaction: txb })
      setTxResult(res.digest)
      // Re-load vaults so the new one appears immediately
      try {
        const updated = await bm.getVaults(account.address)
        setVaults(updated)
        if (updated.length > 0) setSelectedVault(updated[0]?.objectId ?? '')
      } catch (e) {
        console.error('Failed to refresh vaults:', e)
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      setError(msg.includes('toJSON') ? 'Sui Network is currently busy or rate-limiting. Please try again in a moment!' : msg)
      reportError('createVault', e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function checkBlob() {
    const trimmed = blobId.trim()
    if (!trimmed) return setError('Enter a Blob ID')
    setLoading(true); setError(null); setStatus(null); setTxResult(null)
    try {
      const res  = await fetch(`/api/blobs/${encodeURIComponent(trimmed)}/status`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch blob')
      setStatus(data)
    } catch (e: any) {
      const msg = e?.message || String(e)
      setError(msg.includes('toJSON') ? 'Sui Network is currently busy or rate-limiting. Please try again in a moment!' : msg)
      reportError('checkBlob', e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function enableAutopilot() {
    if (!account)       return setError('Connect your Sui Wallet first')
    if (!selectedVault) return setError('Create a Vault first (Step 1)')
    const trimmed = blobId.trim()
    if (!trimmed)       return setError('Enter a Blob ID first')
    setLoading(true); setError(null)
    try {
      const config = {
        saver:    { renewWhenEpochsLeft: 1,  epochsToAdd: 10, maxPricePerEpochMist: BigInt(500_000),   keeperRewardMist: BigInt(10_000_000) },
        balanced: { renewWhenEpochsLeft: 5,  epochsToAdd: 30, maxPricePerEpochMist: BigInt(1_000_000), keeperRewardMist: BigInt(50_000_000) },
        premium:  { renewWhenEpochsLeft: 30, epochsToAdd: 90, maxPricePerEpochMist: BigInt(5_000_000), keeperRewardMist: BigInt(200_000_000) },
      }
      const { renewWhenEpochsLeft: renewThreshold, epochsToAdd, maxPricePerEpochMist: maxPrice, keeperRewardMist: keeperReward } = config[profile]
      const txb = new Transaction()
      txb.moveCall({
        target: `${bm.networkConfig.packageId}::vault::register_autopilot`,
        arguments: [
          txb.object(selectedVault),
          txb.pure.string(trimmed),
          txb.pure.u64(maxPrice),
          txb.pure.u64(renewThreshold),
          txb.pure.u64(epochsToAdd),
          txb.pure.u64(keeperReward)
        ],
      })
      const res = await signAndExecuteTransaction({ transaction: txb })
      setTxResult(res.digest)
    } catch (e: any) {
      const msg = e?.message || String(e)
      setError(msg.includes('toJSON') ? 'Sui Network is currently busy or rate-limiting. Please try again in a moment!' : msg)
      reportError('enableAutopilot', e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function depositToVault() {
    if (!account)       return setError('Connect your Sui Wallet first')
    if (!selectedVault) return setError('Create a Vault first (Step 1)')
    setLoading(true); setError(null)
    try {
      const depositMist = BigInt(1500000000)
      const txb = new Transaction()
      const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(depositMist)])
      txb.moveCall({
        target: `${bm.networkConfig.packageId}::vault::deposit`,
        arguments: [txb.object(selectedVault), coin],
      })
      const res = await signAndExecuteTransaction({ transaction: txb })
      setTxResult(res.digest)
    } catch (e: any) {
      const msg = e?.message || String(e)
      setError(msg.includes('toJSON') ? 'Sui Network is currently busy or rate-limiting. Please try again in a moment!' : msg)
      reportError('depositToVault', e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
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

        {/* STEP 0 — Wallet Vault Manager */}
        <div className="glass-panel p-5 mb-6 bg-white/[0.02]">
          <div className="text-[11px] text-slate-400 mb-3 uppercase tracking-widest font-semibold">
            1. Your On-Chain Vault
          </div>

          {!account ? (
            <div className="text-neutral-500 text-sm">Connect your wallet above to manage your vaults.</div>
          ) : loadingVaults ? (
            <div className="text-amber-400 text-sm animate-pulse">Loading vaults from chain…</div>
          ) : vaults.length === 0 ? (
            <div>
              <div className="text-neutral-400 text-sm mb-3">
                You don&apos;t have a BlobMaster Vault yet. Create one to get started — it&apos;s a Sui object owned entirely by your wallet.
              </div>
              <button
                id="create-vault-btn"
                onClick={createVault}
                disabled={loading}
                className="bg-amber-500 text-black px-5 py-2 rounded-lg text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
              >
                {loading ? 'Creating…' : 'Create Vault (On-Chain)'}
              </button>
            </div>
          ) : (
            <div>
              <div className="text-[11px] text-neutral-500 mb-1 uppercase tracking-widest">Select Vault</div>
              <select
                id="vault-selector"
                value={selectedVault}
                onChange={e => setSelectedVault(e.target.value)}
                className="w-full bg-black border border-[#333] rounded-lg px-3 py-2 text-white font-mono text-xs mb-3 outline-none focus:border-amber-500/50 transition-all"
              >
                {vaults.map((v: any) => (
                  <option key={v?.objectId} value={v?.objectId}>
                    {v?.objectId}
                  </option>
                ))}
              </select>
              <button
                id="create-another-vault-btn"
                onClick={createVault}
                disabled={loading}
                className="text-amber-400 border border-amber-500/40 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-500/10 transition disabled:opacity-50"
              >
                + Create Another Vault
              </button>
            </div>
          )}
        </div>

        {/* STEP 1 — Upload to Walrus */}
        <div className="glass-panel p-5 mb-6 bg-white/[0.02]">
          <div className="text-[11px] text-slate-400 mb-2 uppercase tracking-widest font-semibold">2. Upload to Walrus</div>
          <div className="flex gap-2 items-center">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="flex-1 bg-black border border-[#333] rounded-lg px-4 py-2 text-white text-sm"
            />
            <button
              onClick={async () => {
                if (!file) return setError('Select a file to upload')
                setUploading(true); setError(null)
                try {
                  const formData = new FormData()
                  formData.append('file', file)
                  const res  = await fetch('/api/blobs/upload', { method: 'POST', body: formData })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || 'Upload failed')
                  setBlobId(data.blobId)
                  alert(`Upload successful!\nBlob ID: ${data.blobId}`)
                } catch (e: any) {
                  setError(e.message)
                } finally {
                  setUploading(false)
                }
              }}
              disabled={!file || uploading}
              className="bg-neutral-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-neutral-700 transition disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>

        {/* STEP 2 — Manage Blob */}
        <div className="glass-panel p-5 mb-6 bg-white/[0.02]">
          <div className="text-[11px] text-slate-400 mb-2 uppercase tracking-widest font-semibold">3. Manage Blob / Register Autopilot</div>
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
        {loading && <div className="text-amber-400 mb-4 animate-pulse text-sm">Processing…</div>}

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
              {txResult.slice(0, 20)}… ↗ SuiVision
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
              <div className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-1">Active Vault</div>
              <div className="font-mono text-[10px] text-neutral-500 mb-3 truncate">
                {selectedVault || 'No vault selected — create one above'}
              </div>
              <div className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-3 mt-4">Optimization Profile</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => setProfile('saver')}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition ${profile === 'saver' ? 'border-amber-500 bg-amber-500/10' : 'border-[#333] bg-black hover:border-[#444]'}`}
                >
                  <span className="text-sm font-bold text-white">Saver 🟢</span>
                  <span className="text-[10px] text-neutral-400">Wait till last epoch. Lowest keeper reward. High risk, lowest cost.</span>
                </button>
                <button
                  onClick={() => setProfile('balanced')}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition ${profile === 'balanced' ? 'border-amber-500 bg-amber-500/10' : 'border-[#333] bg-black hover:border-[#444]'}`}
                >
                  <span className="text-sm font-bold text-white">Balanced 🟡</span>
                  <span className="text-[10px] text-neutral-400">Renew 5 epochs early. Standard reward. Best of both worlds.</span>
                </button>
                <button
                  onClick={() => setProfile('premium')}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition ${profile === 'premium' ? 'border-amber-500 bg-amber-500/10' : 'border-[#333] bg-black hover:border-[#444]'}`}
                >
                  <span className="text-sm font-bold text-white">Premium 🔴</span>
                  <span className="text-[10px] text-neutral-400">Renew 30 epochs early. High reward. Zero risk, high cost.</span>
                </button>
              </div>

              <div className="text-neutral-500 text-[10px] uppercase tracking-widest font-bold mb-3">On-Chain Actions (requires Sui Wallet)</div>
              <div className="flex flex-wrap gap-2">
                <button
                  id="register-autopilot-btn"
                  onClick={enableAutopilot}
                  disabled={!account || !selectedVault || loading}
                  className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition"
                >
                  Register Autopilot Rule (On-Chain)
                </button>
                <button
                  id="deposit-vault-btn"
                  onClick={depositToVault}
                  disabled={!account || !selectedVault || loading}
                  className="border border-amber-500 text-amber-400 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-500 hover:text-black transition disabled:opacity-50"
                >
                  Deposit 1.5 SUI to Vault
                </button>
              </div>
              {!account && (
                <div className="text-neutral-500 text-xs mt-2">Connect your Sui Wallet above to sign transactions</div>
              )}
              {account && !selectedVault && (
                <div className="text-amber-500 text-xs mt-2">⚠️ Create a Vault in Step 1 before registering autopilot</div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
