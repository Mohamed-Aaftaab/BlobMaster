import Link from 'next/link'
import { HomeStats } from '@/components/HomeStats'
import { getHomeStats } from '@/lib/stats-public'

export default async function Home() {
  const stats = await getHomeStats()

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-16">
        <div className="text-green-400 text-sm mb-4">Sui × x402 · Tatum RPC</div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">BlobMaster</h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl">
          Walrus storage blobs expire. BlobMaster keeps them alive forever —
          an AI agent deposits USDC once, calls three methods, and every blob
          auto-extends through x402 HTTP-native payments with zero human intervention.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4">
          <Link href="/dashboard" className="bg-green-500 text-black px-6 py-3 font-bold hover:bg-green-400 transition-colors text-center">
            Open Dashboard →
          </Link>
          <Link
            href="/economy"
            className="border border-green-500/50 text-green-400 px-6 py-3 font-bold hover:bg-green-500/10 transition-colors text-center"
          >
            Agent Vault / live economy →
          </Link>
          <a href="#quickstart" className="border border-gray-700 px-6 py-3 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-center">
            npm install blobmaster-sdk
          </a>
        </div>
      </section>

      <HomeStats
        initialRenewals={stats.totalRenewals ?? 0}
        initialAutopilots={stats.activeAutopilots ?? 0}
      />

      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Check blob health', desc: 'getBlobStatus() queries SUI via Tatum directly. No payment needed.', cost: 'Free' },
            { step: '02', title: 'Extend on demand', desc: 'extendBlob() signs $0.001 USDC via x402. No MetaMask. No popup. Receipt stored on SUI.', cost: '$0.001 USDC' },
            { step: '03', title: 'Set and forget', desc: 'enableAutopilot() registers monitoring. BlobMaster extends before expiry automatically.', cost: '$0.001 USDC' },
          ].map(item => (
            <div key={item.step} className="border border-gray-800 p-6">
              <div className="text-green-400 text-sm mb-2">{item.step}</div>
              <div className="font-bold mb-2">{item.title}</div>
              <div className="text-gray-500 text-sm mb-4">{item.desc}</div>
              <div className="text-green-400 text-sm">{item.cost}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="quickstart" className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold mb-6">Three lines of code</h2>
        <pre className="bg-gray-950 border border-gray-800 p-6 text-sm text-gray-300 overflow-x-auto leading-relaxed">
{`import { BlobMaster } from 'blobmaster-sdk'

const bm = new BlobMaster({ x402Wallet: wallet, network: 'testnet' })

await bm.enableAutopilot({ blobId: 'blob_123abc...', extendWhenEpochsLeft: 10 })
// Done. $0.001 USDC charged from wallet automatically on each extension.`}
        </pre>
      </section>
    </main>
  )
}
