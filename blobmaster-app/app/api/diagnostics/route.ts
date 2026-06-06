import { NextResponse } from 'next/server'
import { getTelemetryLogs } from '@/lib/telemetry'
import { generateDiagnosticsReport } from '@/lib/gemini'

export async function GET() {
  try {
    const logs = await getTelemetryLogs()
    const report = await generateDiagnosticsReport(logs)
    return NextResponse.json({ report, logsCount: logs.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
