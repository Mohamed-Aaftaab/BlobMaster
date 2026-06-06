'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Layers, ExternalLink } from 'lucide-react'
import { docsAnchorLinks } from '@/lib/docs-nav'

type Props = {
  onNavigate?: () => void
}

function itemClass(active: boolean): string {
  return [
    'block rounded-lg px-2.5 py-1.5 text-sm transition-colors',
    active
      ? 'bg-white/10 text-blob-cyan font-medium'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
  ].join(' ')
}

export function DocsSidebar({ onNavigate }: Props) {
  const pathname = usePathname() ?? ''
  const is = (path: string) => pathname === path
  const wrap = () => onNavigate?.()

  return (
    <aside className="flex h-full max-h-screen lg:max-h-none w-72 flex-col border-r border-white/5 glass-panel bg-black/10 rounded-none">
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-400">
          <span className="truncate">Search documentation…</span>
          <kbd className="ml-auto hidden sm:inline rounded border border-white/10 bg-transparent px-1.5 py-0.5 font-mono text-[10px] shrink-0">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <BookOpen className="w-3.5 h-3.5" aria-hidden />
            Get started
          </div>
          <nav className="space-y-0.5">
            <Link href="/dev-docs" className={itemClass(is('/dev-docs'))} onClick={wrap}>
              Overview
            </Link>
            <Link
              href="/dev-docs/sdk-quickstart"
              className={itemClass(is('/dev-docs/sdk-quickstart'))}
              onClick={wrap}
            >
              SDK Quickstart
            </Link>
          </nav>
        </div>

        <div>
          <div className="flex items-center gap-1.5 px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Layers className="w-3.5 h-3.5" aria-hidden />
            Reference
          </div>
          <nav className="space-y-0.5">
            {docsAnchorLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={itemClass(false)} onClick={wrap}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Product
          </div>
          <nav className="space-y-0.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200"
              onClick={wrap}
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" aria-hidden />
              Dashboard
            </Link>
            <Link
              href="/economy"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200"
              onClick={wrap}
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" aria-hidden />
              Agent Vault
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-white/5 p-3 text-xs text-slate-600">
        <div className="px-2 py-2 rounded-lg bg-black/20 border border-white/5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Repository</div>
          <a
            href="https://github.com/Mohamed-Aaftaab/BlobMaster"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-blob-cyan transition-colors"
          >
            BlobMaster on GitHub
          </a>
        </div>
      </div>
    </aside>
  )
}
