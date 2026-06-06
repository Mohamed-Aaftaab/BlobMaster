'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { DocsSidebar } from './DocsSidebar'
import { DocsToc } from './DocsToc'

export function DocsChrome({ children }: { children: React.ReactNode }) {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent text-slate-100 font-sans antialiased">
      <div className="lg:hidden shrink-0 z-40 flex h-11 items-center gap-2 border-b border-white/5 glass-panel rounded-none px-4">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-slate-100"
          aria-label="Open documentation menu"
          onClick={() => setMobileNav(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm text-slate-500">Documentation</span>
      </div>
      <div className="flex flex-1 min-h-0 min-w-0 relative">
        {mobileNav && (
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/60 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          />
        )}
        <div
          className={[
            'fixed z-[56] inset-y-0 left-0 lg:static lg:z-0',
            'transform transition-transform duration-200 ease-out',
            mobileNav ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          ].join(' ')}
        >
          <DocsSidebar onNavigate={() => setMobileNav(false)} />
        </div>
        <div className="flex flex-1 min-w-0 min-h-0">
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">{children}</div>
          <DocsToc />
        </div>
      </div>
    </div>
  )
}
