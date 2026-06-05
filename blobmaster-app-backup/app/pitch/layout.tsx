import type { Metadata } from 'next'
import { IBM_Plex_Mono, Literata } from 'next/font/google'

/* Fewer weights = fewer link preloads (cuts “preloaded but not used” noise in dev). */
const serif = Literata({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-pitch-serif',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-pitch-mono',
})

export const metadata: Metadata = {
  title: 'Pitch · BlobMaster',
  description:
    'BlobMaster — automatic Sui blob renewal with x402. Agent Vault is an optional SDK demo at /economy.',
}

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${serif.variable} ${mono.variable} min-h-0 font-[family-name:var(--font-pitch-serif),serif] text-[#e8e4dc]`}
    >
      {children}
    </div>
  )
}
