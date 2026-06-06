import Link from 'next/link'

export function SiteNav() {
  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl">
      <div className="glass-nav rounded-full px-6 h-14 flex items-center justify-between gap-4 shadow-2xl">
        <Link href="/" className="font-bold text-white tracking-tight shrink-0 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gold-500 to-white animate-pulse" />
          BlobMaster
        </Link>
        <nav className="flex items-center gap-6 text-sm flex-wrap justify-end font-medium">
          <Link
            href="/dev-docs"
            className="text-slate-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all"
          >
            Dev Docs
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/diagnostics"
            className="text-amber-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] transition-all flex items-center gap-1"
          >
            Diagnostics 🩺
          </Link>
          <Link
            href="/pitch"
            className="text-slate-300 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all"
          >
            Pitch
          </Link>
          <Link
            href="/economy"
            className="text-gold-500 hover:text-white hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] transition-all"
          >
            Agent Vault
          </Link>
        </nav>
      </div>
    </header>
  )
}
