'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Database,
  ExternalLink,
  Layers,
  LayoutDashboard,
  Network,
  Package,
  RefreshCw,
  Scale,
  Server,
  Shield,
  Wallet,
  Zap,
} from 'lucide-react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { HeroHighlight, Highlight } from '@/components/ui/hero-highlight'

/* Editorial deck: Geist Sans + Geist Mono (layout). Muted palette, varied slide layouts — not card grids. */
const INK = '#e2e8f0'
const MUTED = 'rgba(226,232,240,0.5)'
const FAINT = 'rgba(226,232,240,0.2)'
const ACCENT = '#16bec8' // blob-cyan
const WARM = '#825af0' // blob-purple

const SLIDE_BG: string[] = [
  'transparent',
  'transparent',
  'transparent',
  'transparent',
  'transparent',
  'transparent',
  'transparent',
  'transparent',
]

const SLIDES = [
  'title',
  'problem',
  'product',
  'sdk',
  'architecture',
  'sui',
  'demo',
  'ship',
] as const

function DotNav({
  current,
  total,
  onGo,
}: {
  current: number
  total: number
  onGo: (i: number) => void
}) {
  return (
    <nav
      className="font-mono fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-3 sm:flex"
      aria-label="Slides"
    >
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Slide ${i + 1}`}
          aria-current={i === current ? 'true' : undefined}
          onClick={() => onGo(i)}
          className="transition-all duration-500 ease-out"
          style={{
            width: 2,
            height: i === current ? 28 : 8,
            marginLeft: i === current ? 0 : 1,
            background: i === current ? ACCENT : FAINT,
            borderRadius: 1,
          }}
        />
      ))}
    </nav>
  )
}

function ArrowNav({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="font-mono fixed bottom-8 right-8 z-50 flex items-center gap-4 text-[11px] tracking-[0.12em] text-white/25">
      <span>
        {String(current + 1).padStart(2, '0')} — {String(total).padStart(2, '0')}
      </span>
      <div className="flex gap-1">
        {current > 0 && (
          <button
            type="button"
            onClick={onPrev}
            className="p-2 text-white/35 transition-colors hover:text-white/70"
            aria-label="Previous"
          >
            <ChevronUp size={18} strokeWidth={1.25} />
          </button>
        )}
        {current < total - 1 && (
          <button
            type="button"
            onClick={onNext}
            className="p-2 text-white/35 transition-colors hover:text-white/70"
            aria-label="Next"
          >
            <ChevronDown size={18} strokeWidth={1.25} />
          </button>
        )}
      </div>
    </div>
  )
}

function TitleSlide() {
  return (
    <div className="flex h-full w-full flex-col justify-end px-6 pb-16 pt-24 sm:px-14 sm:pb-24 lg:px-20">
      <div className="mb-6 flex flex-wrap items-center gap-6 text-white/30">
        <RefreshCw size={22} strokeWidth={1.25} style={{ color: ACCENT }} aria-hidden />
        <Wallet size={22} strokeWidth={1.25} aria-hidden />
        <Database size={22} strokeWidth={1.25} aria-hidden />
      </div>
      <p className="font-mono mb-6 max-w-md text-[11px] leading-relaxed tracking-[0.18em] text-white/35">
        FOR JUDGES · SUI · TATUM · X402 · Testnet
      </p>
      <h1 className="mb-6 max-w-4xl text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white">
        <HeroHighlight containerClassName="bg-transparent inline-block p-0">
          <Highlight>BlobMaster</Highlight>
        </HeroHighlight>
      </h1>
      <p className="mb-4 max-w-xl text-lg leading-snug sm:text-xl" style={{ color: MUTED }}>
        What we want you to score: <strong className="font-semibold text-white">blob renewal on Sui</strong>{' '}
        paid over HTTP with <strong className="font-semibold text-white">x402</strong>, plus autopilot so it keeps
        running without someone clicking a wallet every epoch.
      </p>
      <p className="mb-12 max-w-lg text-sm leading-relaxed sm:text-[15px]" style={{ color: FAINT }}>
        <span className="font-mono text-[11px] tracking-[0.12em] text-white/30">SECONDARY DEMO</span> —{' '}
        <span style={{ color: MUTED }}>/economy</span> is a live graph that stress-tests{' '}
        <span className="font-mono text-[13px] text-white/40">AgentVault</span> (Walrus + Pin) inside the same{' '}
        <span className="font-mono text-[13px] text-white/40">blobmaster-sdk</span> package. Impressive on screen; not the
        core submission story.
      </p>
      <div className="font-mono flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-white/[0.08] pt-8 text-[11px] tracking-[0.14em] text-white/30">
        <span className="inline-flex items-center gap-2">
          <RefreshCw size={14} strokeWidth={1.5} className="text-white/35" aria-hidden />
          RENEW VIA X402
        </span>
        <span className="inline-flex items-center gap-2">
          <Zap size={14} strokeWidth={1.5} className="text-white/35" aria-hidden />
          AUTOPILOT
        </span>
        <span className="inline-flex items-center gap-2">
          <Package size={14} strokeWidth={1.5} className="text-white/35" aria-hidden />
          blobmaster-sdk
        </span>
      </div>
    </div>
  )
}

function ProblemSlide() {
  const rows = [
    {
      icon: <RefreshCw size={22} strokeWidth={1.25} style={{ color: ACCENT }} aria-hidden />,
      t: 'Epochs run out',
      b: 'Blobs end on-chain whether your team remembered or not. You should see automation, not a calendar hack.',
    },
    {
      icon: <Wallet size={22} strokeWidth={1.25} className="text-white/35" aria-hidden />,
      t: 'Wallet popups do not scale',
      b: 'If every renewal needs a human in a browser, that is ops, not product. We built for APIs and agents.',
    },
    {
      icon: <Server size={22} strokeWidth={1.25} className="text-white/35" aria-hidden />,
      t: 'Pay like HTTP',
      b: 'x402: pay the 402, retry with proof. BlobMaster wraps that into calls and a dashboard you can verify live.',
    },
  ]
  return (
    <div className="grid h-full w-full grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-20">
      <div>
        <p className="font-mono mb-6 inline-flex items-center gap-2 text-[11px] tracking-[0.2em]" style={{ color: WARM }}>
          <Scale size={14} strokeWidth={1.5} aria-hidden />
          WHAT TO LOOK FOR
        </p>
        <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-[1.15] tracking-[-0.02em]" style={{ color: INK }}>
          Renewals fail when nobody is watching.
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed" style={{ color: FAINT }}>
          This slide frames the problem we are solving for you — not a generic “storage is hard” slide.
        </p>
      </div>
      <ul className="space-y-0 divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
        {rows.map((row) => (
          <li key={row.t} className="flex gap-5 py-6 first:pt-0 last:pb-0">
            <div className="mt-0.5 shrink-0">{row.icon}</div>
            <div>
              <div className="font-mono mb-2 text-[10px] tracking-[0.15em] text-white/35">{row.t.toUpperCase()}</div>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>
                {row.b}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductSlide() {
  const steps = [
    {
      icon: <Activity size={22} strokeWidth={1.25} style={{ color: ACCENT }} aria-hidden />,
      fn: 'getBlobStatus',
      note: 'Ask the chain where the blob stands. No payment — good for “show me it is real Sui.”',
    },
    {
      icon: <RefreshCw size={22} strokeWidth={1.25} className="text-white/35" aria-hidden />,
      fn: 'renewBlob',
      note: 'Pay with x402 / ETH; follow the receipt. This is the line we want you to trace in the explorer.',
    },
    {
      icon: <Zap size={22} strokeWidth={1.25} className="text-white/35" aria-hidden />,
      fn: 'enableAutopilot',
      note: 'We renew before you hit the cliff. That is the “it keeps working” moment for scoring.',
    },
  ]
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 sm:px-16 lg:px-24">
      <p className="font-mono mb-10 inline-flex items-center gap-2 text-[11px] tracking-[0.2em]" style={{ color: ACCENT }}>
        <LayoutDashboard size={14} strokeWidth={1.5} aria-hidden />
        CORE PRODUCT (SCORE THIS FIRST)
      </p>
      <h2 className="mb-12 max-w-2xl text-[clamp(1.6rem,3.5vw,2.75rem)] font-semibold leading-tight tracking-[-0.02em] text-white">
        Three calls you can verify in our dashboard and SDK.
      </h2>
      <div className="max-w-2xl space-y-0 divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {steps.map((row) => (
          <div key={row.fn} className="flex gap-5 py-7 sm:items-start">
            <div className="mt-1 shrink-0">{row.icon}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-10">
              <code className="font-mono shrink-0 text-[14px] text-[#f0ebe3]">{row.fn}()</code>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>
                {row.note}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-10 max-w-lg text-sm" style={{ color: FAINT }}>
        <strong className="font-medium text-white/35">For judges:</strong> start here before /economy — renewal is the
        submission; the graph is supporting evidence for the SDK.
      </p>
    </div>
  )
}

function SdkSlide() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-14 px-6 lg:flex-row lg:items-stretch lg:gap-0 lg:px-0">
      <div className="flex flex-1 flex-col justify-center border-white/[0.06] lg:border-r lg:px-16 lg:py-20 xl:px-24">
        <p className="font-mono mb-6 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-white/35">
          <Package size={14} strokeWidth={1.5} aria-hidden />
          ONE NPM PACKAGE
        </p>
        <pre className="font-mono mb-8 overflow-x-auto text-[12px] leading-loose text-white/55 sm:text-[13px]">
          {`npm i blobmaster-sdk

import { BlobMaster } from 'blobmaster-sdk'
// renewals · x402 · autopilot

import { AgentVault } from 'blobmaster-sdk'
// Walrus · Pin · agents`}
        </pre>
        <p className="max-w-md text-[15px] leading-relaxed" style={{ color: MUTED }}>
          <strong className="font-medium text-[#ebe7df]">For judges:</strong> one dependency to review.{' '}
          <span className="font-mono text-[13px]">BlobMaster</span> is the product path;{' '}
          <span className="font-mono text-[13px]">AgentVault</span> is the Sui Cloud depth path.
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center lg:px-16 lg:py-20 xl:px-20">
        <p className="font-mono mb-6 inline-flex items-center gap-2 text-[11px] tracking-[0.2em]" style={{ color: WARM }}>
          <Shield size={14} strokeWidth={1.5} aria-hidden />
          AGENTVAULT (DEMO / BUILDERS)
        </p>
        <p className="text-[clamp(1.25rem,2.5vw,1.65rem)] font-medium leading-snug text-white">
          Walrus for store/retrieve, Sui native extension — the hooks we surface when you open{' '}
          <span className="font-mono text-[0.85em] text-white/50">/economy</span> or read agent code.
        </p>
        <p className="mt-6 text-sm leading-relaxed" style={{ color: FAINT }}>
          Same package as renewals; different class. We separated them so scoring is not confused.
        </p>
      </div>
    </div>
  )
}

function ArchitectureSlide() {
  const rows = [
    {
      icon: <LayoutDashboard size={18} strokeWidth={1.25} style={{ color: ACCENT }} aria-hidden />,
      name: 'blobmaster-app',
      detail: 'Next.js: dashboard + x402 + blob APIs + Prisma. Where you click before you read code.',
    },
    {
      icon: <Package size={18} strokeWidth={1.25} style={{ color: ACCENT }} aria-hidden />,
      name: 'blobmaster-sdk',
      detail: 'Shared library: BlobMaster + AgentVault, viem, CJS/ESM — trace imports from the app into here.',
    },
    {
      icon: <Network size={18} strokeWidth={1.25} className="text-white/35" aria-hidden />,
      name: '/economy',
      detail: 'SSE + force graph + agent routes. Optional tour after you have seen renewal.',
    },
    {
      icon: <Layers size={18} strokeWidth={1.25} className="text-white/35" aria-hidden />,
      name: 'blobmaster-contracts',
      detail: 'Registry + budget on Testnet when deployed — env addresses in README.',
    },
  ]
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 sm:px-16 lg:px-24">
      <p className="font-mono mb-12 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-white/35">
        <Layers size={14} strokeWidth={1.5} aria-hidden />
        REPO MAP (WHAT TO OPEN)
      </p>
      <div className="relative max-w-2xl border-l border-white/[0.12] pl-8 sm:pl-10">
        {rows.map((r, i) => (
          <div key={r.name} className="relative pb-12 last:pb-0">
            <span
              className="absolute -left-[5px] top-2 h-2 w-2 -translate-x-1/2 rounded-full"
              style={{ background: i < 2 ? ACCENT : 'rgba(232,228,220,0.25)' }}
            />
            <div className="mb-2 flex items-center gap-3">
              {r.icon}
              <span className="font-mono text-[13px] text-white">{r.name}</span>
            </div>
            <p className="pl-[30px] text-[15px] leading-relaxed sm:pl-8" style={{ color: MUTED }}>
              {r.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SuiSlide() {
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 sm:px-16 lg:px-24">
      <p className="font-mono mb-8 inline-flex items-center gap-2 text-[11px] tracking-[0.2em]" style={{ color: ACCENT }}>
        <Scale size={14} strokeWidth={1.5} aria-hidden />
        HOW WE WANT THIS JUDGED
      </p>
      <div className="grid max-w-4xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Coins size={22} strokeWidth={1.25} style={{ color: ACCENT }} aria-hidden />
            <h3 className="text-xl font-semibold text-white">Primary: x402 + blobs</h3>
          </div>
          <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>
            Follow ETH and renewal from the app or SDK into chain evidence. That is the main bar for “does Sui +
            payments work.”
          </p>
        </div>
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Database size={22} strokeWidth={1.25} className="text-white/35" aria-hidden />
            <h3 className="text-xl font-semibold text-white">Secondary: Walrus + Pin</h3>
          </div>
          <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>
            When you review <span className="font-mono text-[13px]">AgentVault</span> or /economy, expect real Onchain
            Cloud usage — supporting depth, not a second product pitch.
          </p>
        </div>
      </div>
    </div>
  )
}

function DemoSlide() {
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 sm:px-14 lg:px-20">
      <div className="mb-8 flex items-center gap-4">
        <Network size={28} strokeWidth={1.15} className="text-white/20" aria-hidden />
        <span className="font-mono text-[11px] tracking-[0.25em] text-white/35">OPTIONAL LIVE DEMO</span>
      </div>
      <div className="mb-10 flex flex-wrap items-end gap-4">
        <span className="text-[clamp(3rem,12vw,7rem)] font-semibold leading-none tracking-[-0.04em] text-white/[0.12]">
          economy
        </span>
      </div>
      <p className="mb-10 max-w-xl text-lg leading-snug" style={{ color: MUTED }}>
        <strong className="font-medium text-[#ebe7df]">For judges:</strong> if you have time, this route shows agents
        moving money and storage in one screen — proof that <span className="font-mono text-[13px]">AgentVault</span>{' '}
        is wired, not mocked.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/dashboard"
          className="font-mono inline-flex items-center gap-2 border border-white/20 bg-[#f5f2eb] px-6 py-3 text-[12px] font-medium tracking-[0.1em] text-[#1a1917] transition-opacity hover:opacity-90"
        >
          <LayoutDashboard size={14} strokeWidth={1.5} aria-hidden />
          DASHBOARD (START HERE)
          <ExternalLink size={14} strokeWidth={1.5} />
        </Link>
        <Link
          href="/economy"
          className="font-mono inline-flex items-center gap-2 border border-white/15 px-6 py-3 text-[12px] tracking-[0.1em] text-white/55 transition-colors hover:border-white/25 hover:text-white/80"
        >
          <Network size={14} strokeWidth={1.5} aria-hidden />
          /ECONOMY
        </Link>
      </div>
    </div>
  )
}

function ShipSlide() {
  const items = [
    'Lead scoring with x402 renewals + autopilot (dashboard + BlobMaster class).',
    'One package: blobmaster-sdk — BlobMaster for product, AgentVault for Sui Cloud depth.',
    'Use /economy only after renewal is clear — it is SDK showcase, not the headline.',
    'Explorer + README env: verify our Testnet addresses and flows yourself.',
  ]
  return (
    <div className="flex h-full w-full flex-col justify-center px-6 sm:px-16 lg:px-24">
      <p className="font-mono mb-8 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-white/35">
        <CheckCircle2 size={14} strokeWidth={1.5} style={{ color: ACCENT }} aria-hidden />
        CLOSING (FOR JUDGES)
      </p>
      <p className="mb-8 max-w-2xl text-[clamp(1.35rem,3vw,2rem)] font-medium leading-snug text-white">
        We are asking you to evaluate BlobMaster as renewal infrastructure first. Everything else is so you can trust the
        SDK.
      </p>
      <ul className="mb-12 max-w-2xl space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: MUTED }}>
            <CheckCircle2 size={18} strokeWidth={1.25} className="mt-0.5 shrink-0 text-white/25" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <p className="mb-8 max-w-xl text-sm" style={{ color: FAINT }}>
        Deck source: <span className="font-mono text-[12px] text-white/35">app/pitch/page.tsx</span> · notes:{' '}
        <span className="font-mono text-[12px] text-white/35">content/pitch.md</span>
      </p>
      <Link
        href="/"
        className="font-mono inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-white/30 hover:text-white/55"
      >
        <ArrowLeft size={12} strokeWidth={1.5} aria-hidden />
        BACK TO APP
      </Link>
    </div>
  )
}

const SLIDE_COMPONENTS = [
  TitleSlide,
  ProblemSlide,
  ProductSlide,
  SdkSlide,
  ArchitectureSlide,
  SuiSlide,
  DemoSlide,
  ShipSlide,
]

export default function PitchPage() {
  const [current, setCurrent] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isScrolling = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const goTo = useCallback((index: number) => {
    isScrolling.current = true
    setCurrent(index)
    const container = scrollRef.current
    if (!container) return
    const slide = container.children[index] as HTMLElement
    slide?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => {
      isScrolling.current = false
    }, 800)
  }, [])

  const goNext = useCallback(() => {
    if (current < SLIDES.length - 1) goTo(current + 1)
  }, [current, goTo])
  const goPrev = useCallback(() => {
    if (current > 0) goTo(current - 1)
  }, [current, goTo])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goNext()
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Array.from(container.children).indexOf(entry.target as HTMLElement)
            if (idx !== -1) setCurrent(idx)
          }
        }
      },
      { root: container, threshold: 0.55 }
    )

    Array.from(container.children).forEach((child) => observerRef.current!.observe(child))
    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div
      className="relative overflow-hidden text-[#e8e4dc]"
      style={{ height: 'calc(100vh - 3.5rem)' }}
    >
      <Link
        href="/"
        className="font-mono fixed left-6 top-20 z-50 text-[10px] tracking-[0.2em] text-white/25 transition-colors hover:text-white/45 sm:left-8"
      >
        CLOSE
      </Link>

      <p className="font-mono fixed bottom-8 left-6 z-50 hidden text-[10px] tracking-[0.18em] text-white/15 sm:left-8 sm:block">
        ARROWS · SPACE
      </p>

      <DotNav current={current} total={SLIDES.length} onGo={goTo} />
      <ArrowNav current={current} total={SLIDES.length} onPrev={goPrev} onNext={goNext} />

      <div
        ref={scrollRef}
        className="h-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden z-10 relative"
      >
        {SLIDE_COMPONENTS.map((SlideComp, i) => (
          <div
            key={SLIDES[i]}
            className="flex min-h-[calc(100dvh-3.5rem)] w-full snap-start items-stretch"
            style={{ background: SLIDE_BG[i % SLIDE_BG.length] }}
          >
            <SlideComp />
          </div>
        ))}
      </div>
      <BackgroundBeams />
    </div>
  )
}
