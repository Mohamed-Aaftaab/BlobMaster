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
      ? 'bg-zinc-800 text-zinc-50 font-medium'
      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
  ].join(' ')
}

export function DocsSidebar({ onNavigate }: Props) {
  const pathname = usePathname() ?? ''
  const is = (path: string) => pathname === path
  const wrap = () => onNavigate?.()

  return (
    <aside className="flex h-full max-h-screen lg:max-h-none w-72 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="p-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-500">
          <span className="truncate">Search documentation…</span>
          <kbd className="ml-auto hidden sm:inline rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] shrink-0">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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
          <div className="flex items-center gap-1.5 px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Product
          </div>
          <nav className="space-y-0.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              onClick={wrap}
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" aria-hidden />
              Dashboard
            </Link>
            <Link
              href="/economy"
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              onClick={wrap}
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" aria-hidden />
              Agent Vault
            </Link>
          </nav>
        </div>
      </div>

      <div className="border-t border-zinc-800 p-3 text-xs text-zinc-600">
        <div className="px-2 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Repository</div>
          <a
            href="https://github.com/nirmalplays/BlobMaster"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            BlobMaster on GitHub
          </a>
        </div>
      </div>
    </aside>
  )
}
