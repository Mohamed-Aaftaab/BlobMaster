'use client'

import { SiteNav } from '@/components/SiteNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#080808] text-white overflow-hidden font-sans">
      {/* 1. Subtle Architectural Grid (Global) */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      {/* 2. Warm Ambient Gold Lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center">
        {/* Top center soft spotlight */}
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[500px] bg-gold-500/10 rounded-[100%] blur-[120px] mix-blend-screen opacity-50" />
        
        {/* Bottom corners faint warmth */}
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-gold-600/5 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      {/* 3. Film Grain Noise Overlay (Top layer) */}
      <div className="bg-noise absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen z-50" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <SiteNav />
        <div className="flex-1 flex flex-col min-h-0 min-w-0 pt-24 px-4 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  )
}
