import { NextResponse } from 'next/server'
import { spawnEconomy, DEFAULT_SPAWN } from '@/agents/spawner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  await spawnEconomy(DEFAULT_SPAWN)
  return NextResponse.json({ started: true })
}
