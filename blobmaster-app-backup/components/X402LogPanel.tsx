'use client'
import { useEffect, useRef, useState } from 'react'

interface LogLine {
  ts: string
  type: 'step' | 'api' | 'tx' | 'error' | 'success'
  msg: string
}

export function X402LogPanel({ blobId, active }: { blobId: string; active: boolean }) {
  const [logs, setLogs] = useState<LogLine[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !blobId) return
    setLogs([])
    const es = new EventSource(`/api/logs?blobId=${blobId}`)
    es.onmessage = (e) => {
      const line: LogLine = JSON.parse(e.data)
      setLogs(prev => [...prev, line])
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [active, blobId])

  if (!active && logs.length === 0) return null

  const color = (type: LogLine['type']) => ({
    step:    '#888',
    api:     '#4488ff',
    tx:      '#00cc88',
    error:   '#ff4444',
    success: '#00ff88',
  }[type])

  return (
    <div style={{
      marginTop: '1rem',
      background: '#0a0a0a',
      border: '1px solid #222',
      borderRadius: 8,
      padding: '12px 16px',
      fontFamily: 'monospace',
      fontSize: 12,
      maxHeight: 280,
      overflowY: 'auto',
    }}>
      <div style={{ color: '#555', marginBottom: 8, fontSize: 11 }}>
        ── x402 execution log · blob {blobId} ──
      </div>
      {logs.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
          <span style={{ color: '#444', minWidth: 60 }}>{l.ts}</span>
          <span style={{ color: color(l.type) }}>{l.msg}</span>
        </div>
      ))}
      {active && logs.length === 0 && (
        <div style={{ color: '#444' }}>waiting for events...</div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}