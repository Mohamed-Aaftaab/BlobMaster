import Link from 'next/link'
import { HomeStats } from '@/components/HomeStats'
import { getHomeStats } from '@/lib/stats-public'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { Highlight } from '@/components/ui/hero-highlight'

export default async function Home() {
  const stats = await getHomeStats()

  return (
    <main className="min-h-[85vh] flex flex-col items-center justify-center text-center relative overflow-hidden">
      <BackgroundBeams className="opacity-60" />
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 relative z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-500 text-sm mb-8 shadow-lg">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-500"></span>
          </span>
          Sui × x402 · Tatum RPC
        </div>
        
        <h1 className="text-6xl md:text-8xl font-semibold mb-6 tracking-tight text-white">
          <Highlight>BlobMaster</Highlight>
        </h1>
        
        <p className="text-xl md:text-2xl text-neutral-400 mb-12 max-w-3xl leading-relaxed">
          Walrus storage blobs expire. BlobMaster keeps them alive forever —
          an AI agent deposits ETH once, and every blob
          <span className="text-gold-500 font-semibold"> auto-extends </span> 
          through x402 HTTP-native payments with zero human intervention.
        </p>
        
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-6 w-full max-w-2xl">
          <Link href="/dashboard" className="relative group px-8 py-4 rounded-xl bg-gold-500 text-black font-bold text-lg hover:shadow-lg hover:shadow-gold-500/20 hover:bg-gold-400 transition-all duration-300">
            Open Dashboard
          </Link>
          <Link
            href="/economy"
            className="px-8 py-4 rounded-xl border border-[#333] bg-black/50 text-white font-bold text-lg hover:border-gold-500/50 hover:bg-[#111] transition-all duration-300 flex items-center justify-center gap-2"
          >
            Agent Vault Live Demo 
            <span className="text-gold-500">→</span>
          </Link>
        </div>
      </section>

      <div className="w-full max-w-5xl px-6 relative z-10 my-16">
        <HomeStats
          initialRenewals={stats.totalRenewals ?? 0}
          initialAutopilots={stats.activeAutopilots ?? 0}
        />
      </div>

      <section className="w-full max-w-5xl mx-auto px-6 py-16 relative z-10">
        <h2 className="text-3xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Check blob health', desc: 'getBlobStorageInfo() queries SUI via Tatum directly. No payment needed.', cost: 'Free', color: 'from-gold-400 to-gold-600' },
            { step: '02', title: 'Extend on demand', desc: 'extendBlob() signs $0.001 ETH via x402. No MetaMask. No popup. Receipt stored on SUI.', cost: '$0.001 ETH', color: 'from-zinc-400 to-zinc-600' },
            { step: '03', title: 'Set and forget', desc: 'enableAutopilot() registers monitoring. BlobMaster extends before expiry automatically.', cost: '$0.001 ETH', color: 'from-neutral-200 to-neutral-400' },
          ].map(item => (
            <div key={item.step} className="group bg-[#0a0a0a] border border-[#222] p-8 rounded-2xl hover:border-gold-500/50 transition-all duration-300 relative overflow-hidden text-left shadow-xl">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.color} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
              <div className={`text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-br ${item.color} opacity-80 transition-opacity`}>{item.step}</div>
              <div className="text-xl font-bold mb-3 text-white">{item.title}</div>
              <div className="text-neutral-400 leading-relaxed mb-6">{item.desc}</div>
              <div className="inline-block px-3 py-1 rounded-lg bg-black border border-[#333] text-neutral-300 text-sm font-medium">{item.cost}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="quickstart" className="w-full max-w-3xl mx-auto px-6 pb-24 relative z-10">
        <div className="bg-[#050505] border border-[#222] overflow-hidden rounded-2xl text-left shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0a0a] border-b border-[#222]">
            <div className="w-3 h-3 rounded-full bg-[#333]"></div>
            <div className="w-3 h-3 rounded-full bg-[#333]"></div>
            <div className="w-3 h-3 rounded-full bg-[#333]"></div>
            <span className="ml-4 text-xs text-neutral-500 font-mono">quickstart.ts</span>
          </div>
          <div className="p-6 overflow-x-auto bg-black">
            <pre className="text-sm font-mono leading-relaxed">
<span className="text-gold-400">import</span> <span className="text-white">&#123; BlobMaster &#125;</span> <span className="text-gold-400">from</span> <span className="text-neutral-400">'blobmaster-sdk'</span>{'\n\n'}
<span className="text-gold-400">const</span> <span className="text-white">bm</span> <span className="text-white">=</span> <span className="text-gold-400">new</span> <span className="text-white">BlobMaster</span><span className="text-white">(&#123; x402Wallet: wallet, network: </span><span className="text-neutral-400">'testnet'</span><span className="text-white"> &#125;)</span>{'\n\n'}
<span className="text-white">await</span> <span className="text-white">bm.</span><span className="text-gold-400">enableAutopilot</span><span className="text-white">(&#123; blobId: </span><span className="text-neutral-400">'blob_123abc...'</span><span className="text-white">, extendWhenEpochsLeft: </span><span className="text-gold-400">10</span><span className="text-white"> &#125;)</span>{'\n'}
<span className="text-[#666]">// Done. $0.001 ETH charged from wallet automatically on each extension.</span>
            </pre>
          </div>
        </div>
      </section>
    </main>
  )
}
