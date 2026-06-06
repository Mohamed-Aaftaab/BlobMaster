import { NextResponse } from 'next/server'
import { getTelemetryLogs, saveTelemetryEvent } from '@/lib/telemetry'

export async function GET() {
  const logs = await getTelemetryLogs()
  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (!body.source || !body.type || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const event = await saveTelemetryEvent({
      source: body.source,
      type: body.type,
      message: body.message,
    })
    
    return NextResponse.json({ success: true, event })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
