'use client'
import type { AgentNode } from './AgentNetwork'

interface Props {
  node: AgentNode | null
  onClose: () => void
}

function typeColor(type: string): string {
  return ({ producer: 'text-green-400', consumer: 'text-blue-400', guardian: 'text-yellow-400', sui: 'text-blue-400' } as any)[type] ?? 'text-gray-400'
}

export function AgentPanel({ node, onClose }: Props) {
  if (!node || node.type === 'sui') return null

  const pct = node.budgetTotal > 0
    ? ((node.budget / node.budgetTotal) * 100).toFixed(0)
    : '0'

  return (
    <div className="absolute top-0 right-0 w-72 h-full bg-[#0c1220] border-l border-gray-800 p-5 z-10 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className={`font-bold text-lg ${typeColor(node.type)}`}>{node.id}</div>
          <div className="text-gray-500 text-xs uppercase mt-0.5">{node.type}</div>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
      </div>

      <div className="space-y-3 text-sm flex-1">
        <Row label="Status">
          <span className={node.alive ? 'text-green-400' : 'text-red-400'}>
            {node.alive ? '✅ Alive' : '💀 Dead'}
          </span>
        </Row>
        <Row label="Budget">
          <div>
            <span className="text-white">{node.budget.toFixed(4)} USDFC</span>
            <span className="text-gray-500 ml-2">{pct}% remaining</span>
          </div>
          {node.type === 'consumer' && (
            <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: parseFloat(pct) < 20 ? '#ff4444' : '#4488ff',
                }}
              />
            </div>
          )}
        </Row>
        <Row label="Stored">
          <span className="text-white">{formatBytes(node.stored)}</span>
        </Row>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-gray-600 text-xs uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-gray-300">{children}</div>
    </div>
  )
}

function formatBytes(b: number): string {
  if (b > 1_000_000) return `${(b / 1_000_000).toFixed(1)} MB`
  if (b > 1_000)     return `${(b / 1_000).toFixed(1)} KB`
  return `${b} B`
}
