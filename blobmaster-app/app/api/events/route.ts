import { eventBus } from '@/lib/event-bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const history = eventBus.getHistory(20)
      for (const event of history.reverse()) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch { /* stream closed */ }
      }

      eventBus.on('agent:store',    send)
      eventBus.on('agent:pay',      send)
      eventBus.on('agent:extend',    send)
      eventBus.on('agent:died',     send)
      eventBus.on('agent:prune',    send)
      eventBus.on('agent:announce', send)
      eventBus.on('agent:budget',   send)
      eventBus.on('agent:renew',    send)
      eventBus.on('agent:blob',     send)

      const hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(hb)
        }
      }, 15_000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
