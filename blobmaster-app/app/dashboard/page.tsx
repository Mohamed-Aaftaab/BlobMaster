'use client'
import { useState, useEffect } from 'react'
import { ConnectButton, useCurrentAccount, useSignTransaction, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { BlobMaster } from 'blobmaster-sdk'

const bm = new BlobMaster({ 
  network: 'testnet',
  suiRpc: 'https://fullnode.testnet.sui.io:443'
})

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

  // Emergency: private key bypass for broken wallet extensions
  const [privKey, setPrivKey] = useState('')
  const [showPrivKey, setShowPrivKey] = useState(false)

  // ✨ Success modal state
  const [autopilotModal, setAutopilotModal] = useState<{ digest: string; profile: string } | null>(null)
  const [depositModal, setDepositModal]     = useState<{ digest: string } | null>(null)

  const account = useCurrentAccount()
  const { mutateAsync: signTransaction } = useSignTransaction()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()

  // Compute active address (wallet or bypass)
  const [bypassAddress, setBypassAddress] = useState<string>('')
  useEffect(() => {
    if (privKey.trim()) {
      try {
        const input = privKey.trim().replace(/\s+/g, ' ')
        const kp = input.includes(' ') 
          ? Ed25519Keypair.deriveKeypair(input) 
          : Ed25519Keypair.fromSecretKey(input)
        setBypassAddress(kp.toSuiAddress())
      } catch (e) { setBypassAddress('') }
    } else {
      setBypassAddress('')
    }
  }, [privKey])

  const activeAddress = bypassAddress || account?.address

  async function signAndRun(txb: Transaction) {
    // If user pasted a private key or seed phrase, use it directly (bypass broken wallet)
    if (privKey.trim()) {
      const input = privKey.trim().replace(/\s+/g, ' ')
      let keypair: Ed25519Keypair;
      if (input.includes(' ')) {
        // It's a seed phrase
        keypair = Ed25519Keypair.deriveKeypair(input)
      } else {
        // It's a raw private key
        keypair = Ed25519Keypair.fromSecretKey(input)
      }
      const client = suiClient as any
      const res = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: txb,
        options: { showEffects: true, showObjectChanges: true },
      })
      if (res.effects?.status?.status !== 'success') {
        throw new Error(res.effects?.status?.error ?? 'Transaction failed on chain')
      }
      return res
    }
    // Try signAndExecuteTransaction first (lets wallet handle everything)
    try {
      console.log('[BlobMaster] Serializing tx to prevent postMessage clone errors...')
      // We MUST serialize to a string so the wallet's postMessage bridge doesn't crash on class methods
      const serializedTx = await txb.toJSON()
      
      console.log('[BlobMaster] Trying signAndExecuteTransaction...')
      const res = await signAndExecuteTransaction({
        transaction: serializedTx as any,
        chain: 'sui:testnet',
      })
      console.log('[BlobMaster] signAndExecuteTransaction success:', res)
      return res
    } catch (e1: any) {
      console.warn('[BlobMaster] signAndExecuteTransaction failed:', e1?.message, e1)
      // Fallback: sign only, then execute ourselves
      console.log('[BlobMaster] Trying signTransaction fallback...')
      const serializedTx = await txb.toJSON()
      const { bytes, signature } = await signTransaction({ transaction: serializedTx as any, chain: 'sui:testnet' })
      console.log('[BlobMaster] signTransaction success, executing...')
      const res = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showObjectChanges: true },
      })
      console.log('[BlobMaster] executeTransactionBlock result:', res)
      if (res.effects?.status?.status !== 'success') {
        throw new Error(res.effects?.status?.error ?? 'Transaction failed on chain')
      }
      return res
    }
  }

  // Load user's vaults whenever wallet connects — query RPC directly to avoid CORS issues
  useEffect(() => {
    if (!activeAddress) { setVaults([]); setSelectedVault(''); return }
    setLoadingVaults(true)
    // Query Mysten public RPC directly (no CORS restrictions)
    fetch('https://fullnode.testnet.sui.io:443', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'suix_getOwnedObjects',
        params: [
          activeAddress,
          { filter: { StructType: `${bm.networkConfig.packageId}::vault::Vault` }, options: { showContent: true } }
        ]
      })
    })
      .then(r => r.json())
      .then(j => {
        const v = (j?.result?.data ?? []).map((d: any) => d.data).filter(Boolean)
        setVaults(v)
        if (v.length > 0) setSelectedVault(v[0]?.objectId ?? '')
      })
      .catch(() => setVaults([]))
      .finally(() => setLoadingVaults(false))
  }, [activeAddress])

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
    if (!activeAddress) return setError('Connect your Sui Wallet or enter a seed phrase first')
    setLoading(true); setError(null); setTxResult(null)
    try {
      const txb = new Transaction()
      txb.moveCall({
        target: `${bm.networkConfig.packageId}::vault::create_vault`,
        arguments: [],
      })
      const res = await signAndRun(txb)
      setTxResult(res.digest ?? '')
      // Re-load vaults so the new one appears immediately
      try {
        await new Promise(r => setTimeout(r, 2000)) // wait 2s for chain indexing
        const resp = await fetch('https://fullnode.testnet.sui.io:443', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'suix_getOwnedObjects',
            params: [
              activeAddress,
              { filter: { StructType: `${bm.networkConfig.packageId}::vault::Vault` }, options: { showContent: true } }
            ]
          })
        })
        const j = await resp.json()
        const updated = (j?.result?.data ?? []).map((d: any) => d.data).filter(Boolean)
        setVaults(updated)
        if (updated.length > 0) setSelectedVault(updated[0]?.objectId ?? '')
      } catch (e) {
        console.error('Failed to refresh vaults:', e)
      }
    } catch (e: any) {
      console.error('[BlobMaster] FULL ERROR OBJECT:', e)
      console.error('[BlobMaster] Error keys:', Object.keys(e || {}))
      console.error('[BlobMaster] Error message:', e?.message)
      console.error('[BlobMaster] Error code:', e?.code)
      console.error('[BlobMaster] Error data:', e?.data)
      const msg = e?.message || String(e)
      if (msg.toLowerCase().includes('incorrect password') || msg.toLowerCase().includes('wrong password')) {
        setError('⚠️ Slush password error — open DevTools Console (F12) and check the red BlobMaster logs to see the exact error.')
      } else if (msg.includes('toJSON')) {
        setError('Sui Network is currently busy or rate-limiting. Please try again in a moment!')
      } else {
        setError(msg)
      }
      reportError('createVault', msg)
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
    if (!account) return setError('Connect your Sui Wallet first')
    if (!selectedVault) return setError('Create a Vault first (Step 1)')
    const trimmed = blobId.trim()
    if (!trimmed) return setError('Enter a Blob ID first')
    setLoading(true); setError(null)
    try {
      const config = {
        saver:    { renewWhenEpochsLeft: 1,  epochsToAdd: 10, maxPricePerEpochMist: BigInt(500_000),   keeperRewardMist: BigInt(10_000_000) },
        balanced: { renewWhenEpochsLeft: 5,  epochsToAdd: 30, maxPricePerEpochMist: BigInt(1_000_000), keeperRewardMist: BigInt(50_000_000) },
        premium:  { renewWhenEpochsLeft: 30, epochsToAdd: 90, maxPricePerEpochMist: BigInt(5_000_000), keeperRewardMist: BigInt(200_000_000) },
      }
      const { renewWhenEpochsLeft: renewThreshold, epochsToAdd, maxPricePerEpochMist: maxPrice, keeperRewardMist: keeperReward } = config[profile]
      // blob_size_bytes: use status if available, else default to 1MB (1_048_576 bytes)
      const blobSizeBytes = status?.sizeBytes ?? 1_048_576
      const txb = new Transaction()
      txb.moveCall({
        target: `${bm.networkConfig.packageId}::vault::register_autopilot`,
        arguments: [
          txb.object(selectedVault),          // &Vault
          txb.pure.string(trimmed),            // blob_id: String
          txb.pure.u64(renewThreshold),        // renew_when_epochs_left: u64
          txb.pure.u64(epochsToAdd),           // epochs_to_add: u64
          txb.pure.u64(maxPrice),              // max_price_per_epoch: u64
          txb.pure.u64(keeperReward),          // keeper_reward: u64
          txb.pure.string(''),                 // webhook_url: String (empty = no webhook)
          txb.pure.u64(blobSizeBytes),         // blob_size_bytes: u64
          txb.object('0x6'),                   // clock: &Clock
        ],
      })
      const res = await signAndRun(txb)
      setTxResult(res.digest)
      setAutopilotModal({ digest: res.digest, profile })
    } catch (e: any) {
      const msg = e?.message || String(e)
      setError(msg.includes('toJSON') ? 'Sui Network is currently busy or rate-limiting. Please try again in a moment!' : msg)
      reportError('enableAutopilot', e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function depositToVault() {
    if (!account) return setError('Connect your Sui Wallet first')
    if (!selectedVault) return setError('Create a Vault first (Step 1)')
    setLoading(true); setError(null)
    try {
      const depositMist = BigInt(100_000_000) // 0.1 SUI = 100,000,000 MIST
      const txb = new Transaction()
      const [coin] = txb.splitCoins(txb.gas, [txb.pure.u64(depositMist)])
      txb.moveCall({
        target: `${bm.networkConfig.packageId}::vault::deposit`,
        arguments: [txb.object(selectedVault), coin],
      })
      const res = await signAndRun(txb)
      setTxResult(res.digest)
      setDepositModal({ digest: res.digest })
    } catch (e: any) {
      const msg = e?.message || String(e)
      setError(msg.includes('toJSON') ? 'Sui Network is currently busy or rate-limiting. Please try again in a moment!' : msg)
      reportError('depositToVault', e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────
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
              {/* Emergency bypass for broken wallet extensions */}
              <div className="mb-3">
                <button
                  onClick={() => setShowPrivKey(!showPrivKey)}
                  className="text-xs text-neutral-500 hover:text-amber-400 underline transition"
                >
                  {showPrivKey ? '▲ Hide' : '▼ Wallet not working? Sign with private key instead'}
                </button>
                {showPrivKey && (
                  <div className="mt-2 p-3 bg-neutral-900 border border-amber-500/30 rounded-lg">
                    <div className="text-xs text-amber-400 mb-1">⚠️ Get from Slush: Settings → Security → Export Private Key</div>
                    <input
                      type="password"
                      placeholder="Paste your private key (suiprivkey1... or hex)"
                      value={privKey}
                      onChange={e => setPrivKey(e.target.value)}
                      className="w-full bg-black border border-[#333] rounded px-3 py-2 text-white text-xs font-mono outline-none focus:border-amber-500/50"
                    />
                    <div className="text-xs text-neutral-500 mt-1">Never shared — used only in your browser to sign this transaction.</div>
                  </div>
                )}
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
                  Deposit 0.1 SUI to Vault
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

      {/* ── AUTOPILOT SUCCESS MODAL ── */}
      {autopilotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setAutopilotModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #0f1a0f 0%, #0a1a10 50%, #061410 100%)',
              border: '1px solid rgba(34,197,94,0.4)',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 0 60px rgba(34,197,94,0.2), 0 25px 50px rgba(0,0,0,0.6)',
              animation: 'modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Animated checkmark */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(34,197,94,0.5)',
                fontSize: '36px',
              }}>✓</div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, color: '#22c55e', marginBottom: '8px' }}>
              🤖 Autopilot Enabled!
            </h2>
            <p style={{ textAlign: 'center', color: '#86efac', marginBottom: '28px', fontSize: '14px' }}>
              Your blob is now protected by BlobMaster Keeper Agents
            </p>

            {/* Profile badge */}
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Plan Selected</span>
                <span style={{
                  background: autopilotModal.profile === 'premium' ? 'linear-gradient(90deg,#ef4444,#dc2626)' :
                               autopilotModal.profile === 'balanced' ? 'linear-gradient(90deg,#f59e0b,#d97706)' :
                               'linear-gradient(90deg,#22c55e,#16a34a)',
                  color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                  textTransform: 'capitalize',
                }}>
                  {autopilotModal.profile === 'premium' ? '🔴 Premium' : autopilotModal.profile === 'balanced' ? '🟡 Balanced' : '🟢 Saver'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  ['Renew when', autopilotModal.profile === 'premium' ? '30 epochs left' : autopilotModal.profile === 'balanced' ? '5 epochs left' : '1 epoch left'],
                  ['Adds', autopilotModal.profile === 'premium' ? '90 epochs' : autopilotModal.profile === 'balanced' ? '30 epochs' : '10 epochs'],
                  ['Status', 'Active on Sui'],
                  ['Keeper Network', 'Monitoring...'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 12px' }}>
                    <div style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ color: '#d1fae5', fontSize: '13px', fontWeight: 600 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TX hash */}
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '24px' }}>
              <div style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Transaction Hash</div>
              <a
                href={`https://testnet.suivision.xyz/txblock/${autopilotModal.digest}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: '#34d399', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', textDecoration: 'none' }}
              >
                {autopilotModal.digest} ↗
              </a>
            </div>

            <button
              onClick={() => setAutopilotModal(null)}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                color: 'white', fontWeight: 700, fontSize: '15px',
                borderRadius: '12px', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
              }}
            >
              Got it! 🚀
            </button>
          </div>
        </div>
      )}

      {/* ── DEPOSIT SUCCESS MODAL ── */}
      {depositModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDepositModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #0f0f1a 0%, #0a0a1a 50%, #060614 100%)',
              border: '1px solid rgba(251,191,36,0.4)',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 0 60px rgba(251,191,36,0.15), 0 25px 50px rgba(0,0,0,0.6)',
              animation: 'modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Coin animation */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(251,191,36,0.5)',
                fontSize: '36px',
              }}>🏦</div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 800, color: '#fbbf24', marginBottom: '8px' }}>
              Successfully Deposited!
            </h2>
            <p style={{ textAlign: 'center', color: '#fde68a', marginBottom: '28px', fontSize: '14px' }}>
              SUI has been added to your BlobMaster Vault
            </p>

            {/* Deposit details */}
            <div style={{
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: '12px', padding: '20px', marginBottom: '20px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  ['Amount Deposited', '0.1 SUI'],
                  ['Vault Status', 'Funded ✓'],
                  ['Network', 'Sui Testnet'],
                  ['Keeper Ready', 'Yes 🤖'],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                    <div style={{ color: '#9ca3af', fontSize: '10px', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ color: '#fef3c7', fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TX hash */}
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '24px' }}>
              <div style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Transaction Hash</div>
              <a
                href={`https://testnet.suivision.xyz/txblock/${depositModal.digest}`}
                target="_blank" rel="noopener noreferrer"
                style={{ color: '#fcd34d', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', textDecoration: 'none' }}
              >
                {depositModal.digest} ↗
              </a>
            </div>

            <button
              onClick={() => setDepositModal(null)}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(90deg, #fbbf24, #d97706)',
                color: 'black', fontWeight: 700, fontSize: '15px',
                borderRadius: '12px', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(251,191,36,0.4)',
              }}
            >
              Awesome! 💪
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </main>
  )
}
