'use client'
import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import Lottie from 'lottie-react'
import { makeDeadAnimation, makeOrbitAnimation, makePulseAnimation } from '@/lib/lottie-animations'

function typeIcon(type: string, alive: boolean) {
  if (!alive && type !== 'sui') {
    return <Lottie animationData={makeDeadAnimation()} loop autoplay style={{ width: 28, height: 28 }} />
  }
  if (type === 'producer') return <Lottie animationData={makePulseAnimation('#00ff88', 'producer')} loop autoplay style={{ width: 28, height: 28 }} />
  if (type === 'consumer') return <Lottie animationData={makePulseAnimation('#4488ff', 'consumer')} loop autoplay style={{ width: 28, height: 28 }} />
  if (type === 'guardian') return <Lottie animationData={makeOrbitAnimation('#ff8800')} loop autoplay style={{ width: 28, height: 28 }} />
  if (type === 'sui') return <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 text-xs font-bold spin-slow">⬡</div>
  return null
}

function typeColor(type: string) {
  const map: Record<string, string> = { producer: '#00ff88', consumer: '#4488ff', guardian: '#ff8800', sui: '#0090ff' }
  return map[type] ?? '#888'
}

export interface AgentNodeData {
  label:       string
  type:        'producer' | 'consumer' | 'guardian' | 'sui'
  budget:      number
  budgetTotal: number
  stored:      number
  alive:       boolean
  pulsing:     boolean
  txCount:     number
  earned:      number
}

function formatBytes(b: number) {
  if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`
  if (b > 1e3) return `${(b / 1e3).toFixed(0)} KB`
  return `${b} B`
}

export const AgentNodeCard = memo(function AgentNodeCard({
  data,
}: {
  data: AgentNodeData
}) {
  const { type, label, budget, budgetTotal, stored, alive, pulsing, txCount, earned } = data
  const pct = budgetTotal > 0 ? budget / budgetTotal : 0
  const cls = [
    'agent-node',
    type,
    !alive ? 'dead' : '',
    pulsing && alive ? 'pulsing' : '',
  ].filter(Boolean).join(' ')

  const barColor = pct < 0.2 ? '#ff4444' : pct < 0.5 ? '#ffaa00' : typeColor(type)

  return (
    <div className={cls}>
      <div className="agent-node-header">
        <div className="agent-node-title">
          {typeIcon(type, alive)}
          <span>{label}</span>
        </div>
        <span className={`agent-type-badge badge-${type}`}>{type}</span>
      </div>

      <div className="agent-node-body">
        {type === 'sui' ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#5a6880]">Network</span>
              <span className="text-blue-400">Calibration</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#5a6880]">TXs</span>
              <span className="text-gray-300">{txCount}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between mb-1">
              <span>Budget</span>
              <span style={{ color: alive ? typeColor(type) : '#555' }}>
                {alive ? `${budget.toFixed(3)} USDFC` : 'dead'}
              </span>
            </div>
            {type === 'consumer' && alive && (
              <div className="budget-bar">
                <div className="budget-bar-fill" style={{ width: `${pct * 100}%`, background: barColor }} />
              </div>
            )}
            {stored > 0 && (
              <div className="flex justify-between mt-1.5">
                <span>Stored</span>
                <span className="text-gray-300">{formatBytes(stored)}</span>
              </div>
            )}
            {earned > 0 && (
              <div className="flex justify-between mt-1">
                <span>Earned</span>
                <span className="text-green-400">{earned.toFixed(3)}</span>
              </div>
            )}
            <div className="flex justify-between mt-1">
              <span>TXs</span>
              <span className="text-gray-400">{txCount}</span>
            </div>
          </>
        )}
      </div>

      {type === 'sui' ? (
        <>
          <Handle type="target" position={Position.Left} id="in" style={{ left: -5, top: '50%' }} />
          <Handle type="source" position={Position.Right} id="out" style={{ right: -5, top: '50%' }} />
          <Handle type="target" position={Position.Top} id="top" style={{ top: -5, left: '50%' }} />
          <Handle type="source" position={Position.Bottom} id="bot" style={{ bottom: -5, left: '50%' }} />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Right} id="out" style={{ right: -5, top: '50%' }} />
          <Handle type="target" position={Position.Left} id="in" style={{ left: -5, top: '50%' }} />
        </>
      )}

      {!alive && (
        <div className="absolute top-1.5 right-1.5 text-xs text-gray-600 bg-gray-900/80 px-1.5 rounded">DEAD</div>
      )}
    </div>
  )
})
