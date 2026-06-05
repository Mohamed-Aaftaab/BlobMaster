'use client'

import { SiteNav } from '@/components/SiteNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <SiteNav />
      <div className="flex-1 flex flex-col min-h-0 min-w-0">{children}</div>
    </div>
  )
}
