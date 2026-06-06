import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface TelemetryEvent {
  id: string
  timestamp: number
  source: string
  type: string
  message: string
}

export async function getTelemetryLogs(): Promise<TelemetryEvent[]> {
  try {
    const logs = await prisma.telemetryLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 500,
    })
    return logs.map(l => ({
      ...l,
      timestamp: l.timestamp.getTime()
    }))
  } catch (e) {
    console.warn('[telemetry] Failed to read logs:', e)
    return []
  }
}

export async function saveTelemetryEvent(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): Promise<TelemetryEvent | undefined> {
  try {
    const saved = await prisma.telemetryLog.create({
      data: {
        source: event.source,
        type: event.type,
        message: event.message,
      }
    })
    return {
      ...saved,
      timestamp: saved.timestamp.getTime()
    }
  } catch (e) {
    console.warn('[telemetry] Failed to save event:', e)
  }
}
