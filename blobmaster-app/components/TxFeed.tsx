'use client'
import { useRef, useState } from 'react'
import { useAgentEvents, type AgentEvent } from '@/hooks/useAgentEvents'

interface TxLine {
  id:             string
  time:           string
  from:           string
  to?:            string
  amount?:        number
  type:           string
  cid?:           string
  blobId?:        string
  costETH?:      string
  basescanUrl?:   string | null
  suivisionUrl?:     string | null
  status?:        string
}

function typeLabel(l: TxLine): string {
  if (l.type === 'agent:pay')    return `${l.from} → ${l.to}  [retrieve]`
  if (l.type === 'agent:store')  return `${l.from} → Sui  [store]`
  if (l.type === 'agent:repin')  return `${l.from} re-pinned CID  [rescue]`
  if (l.type === 'agent:died')   return `${l.from}  [DIED]`
  if (l.type === 'agent:renew')  return `${l.from} → BlobMaster  [renew]`
  if (l.type === 'agent:blob')   return `${l.from} blob resolved  [${l.blobId ?? '?'}]`
  return `${l.from} → ${l.to ?? '?'}`
}

function typeColor(t: string): string {
  if (t === 'agent:died')   return 'text-red-400'
  if (t === 'agent:repin')  return 'text-yellow-400'
  if (t === 'agent:store')  return 'text-green-400'
  if (t === 'agent:renew')  return 'text-purple-400'
  if (t === 'agent:blob')   return 'text-cyan-400'
  return 'text-blue-400'
}

const ALLOWED = ['agent:pay', 'agent:store', 'agent:repin', 'agent:died', 'agent:renew', 'agent:blob']

export function TxFeed() {
  const [lines, setLines] = useState<TxLine[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useAgentEvents((e: AgentEvent) => {
    if (!ALLOWED.includes(e.type)) return
    const id   = `${e.timestamp}-${Math.random()}`
    const from = e.agentId ?? e.from ?? '?'
    setLines(prev => [{
      id,
      time:          new Date(e.timestamp).toLocaleTimeString(),
      from,
      to:            e.to,
      amount:        e.amount,
      type:          e.type,
      cid:           e.cid,
      blobId:        e.blobId,
      costETH:      e.costETH,
      basescanUrl:   e.basescanUrl ?? null,
      suivisionUrl:     e.suivisionUrl ?? null,
      status:        e.status,
    }, ...prev].slice(0, 50))
  })

  return (
    <div className="h-full overflow-y-auto px-4 py-2 space-y-0.5">
      {lines.length === 0 && (
        <div className="text-gray-600 text-xs pt-2">Waiting for economy to start…</div>
      )}
      {lines.map(l => (
        <div key={l.id} className={`text-xs flex gap-3 items-start ${typeColor(l.type)}`}>
          <span className="text-gray-600 shrink-0 w-20">{l.time}</span>
          <span className="flex-1 min-w-0">
            <span className="truncate block">{typeLabel(l)}</span>
            {l.type === 'agent:renew' && (l.basescanUrl || l.suivisionUrl) && (
              <span className="flex gap-2 mt-0.5">
                {l.basescanUrl && (
                  <a href={l.basescanUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-blue-400 underline">BaseScan</a>
                )}
                {l.suivisionUrl && (
                  <a href={l.suivisionUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-cyan-400 underline">Filfox</a>
                )}
              </span>
            )}
          </span>
          {l.costETH
            ? <span className="shrink-0 text-gray-400">${l.costETH} ETH</span>
            : l.amount
              ? <span className="shrink-0 text-gray-400">{l.amount.toFixed(3)} ETH</span>
              : null}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
