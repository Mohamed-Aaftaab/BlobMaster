import Link from 'next/link'

export function SiteNav() {
  return (
    <header className="border-b border-gray-800 bg-black/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-white tracking-tight shrink-0">
          BlobMaster
        </Link>
        <nav className="flex items-center gap-5 sm:gap-8 text-sm flex-wrap justify-end">
          <Link
            href="/dev-docs"
            className="text-gray-400 hover:text-green-400 transition-colors"
          >
            Dev Docs
          </Link>
          <Link
            href="/dev-docs/sdk-quickstart"
            className="text-gray-400 hover:text-green-400 transition-colors"
          >
            Quickstart
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-green-400 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/pitch"
            className="text-gray-400 hover:text-green-400 transition-colors"
          >
            Pitch
          </Link>
          <Link
            href="/economy"
            className="text-green-400 hover:text-green-300 font-semibold"
          >
            Agent Vault
          </Link>
        </nav>
      </div>
    </header>
  )
}
