'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { devDocsToc, quickstartToc } from '@/lib/docs-nav'

export function DocsToc() {
  const pathname = usePathname() ?? ''
  const items = useMemo(
    () => (pathname === '/dev-docs/sdk-quickstart' ? quickstartToc : devDocsToc),
    [pathname],
  )

  const [activeId, setActiveId] = useState<string | null>(() => items[0]?.id ?? null)

  useEffect(() => {
    setActiveId(items[0]?.id ?? null)
  }, [items])

  useEffect(() => {
    const nodes = items
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]
    if (nodes.length === 0) return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.target.id) {
            setActiveId(e.target.id)
            break
          }
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
    )

    nodes.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [items])

  return (
    <aside
      className="hidden xl:block w-56 shrink-0 border-l border-zinc-800/80 bg-zinc-950/30 overflow-y-auto"
      aria-label="On this page"
    >
      <div className="sticky top-16 py-8 pl-6 pr-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          On this page
        </div>
        <nav className="space-y-1 text-sm border-l border-zinc-800 ml-1">
          {items.map(({ id, label }) => {
            const active = activeId === id
            return (
              <a
                key={id}
                href={`#${id}`}
                className={[
                  'block pl-3 py-1 -ml-px border-l-2 transition-colors',
                  active
                    ? 'border-zinc-100 text-zinc-100 font-medium'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                {label}
              </a>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
