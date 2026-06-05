import { NextResponse } from 'next/server'
import { stopEconomy } from '@/agents/spawner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  stopEconomy()
  return NextResponse.json({ stopped: true })
}
