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
  hasBeenRevived?: boolean
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
  const { type, label, budget, budgetTotal, stored, alive, pulsing, txCount, earned, hasBeenRevived } = data
  const pct = budgetTotal > 0 ? budget / budgetTotal : 0
  const cls = [
    'agent-node',
    type,
    !alive ? 'dead' : '',
    pulsing && alive ? 'pulsing' : '',
  ].filter(Boolean).join(' ')

  const barColor = pct < 0.2 ? '#ef4444' : pct < 0.5 ? '#f59e0b' : typeColor(type)

  return (
    <div className={`w-56 bg-black backdrop-blur-md border border-[#333] rounded-xl p-4 shadow-2xl flex flex-col gap-3 relative transition-all ${pulsing && alive ? 'ring-1 ring-gold-500 shadow-[0_0_20px_rgba(212,175,55,0.15)]' : ''} ${!alive ? 'opacity-50 grayscale' : ''}`}>
      <div className="flex items-center justify-between border-b border-[#222] pb-3">
        <div className="flex items-center gap-2">
          {typeIcon(type, alive)}
          <span className="font-semibold text-white tracking-tight text-sm">{label}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-[#333] text-neutral-400 bg-[#111]">{type}</span>
      </div>

      <div className="flex flex-col gap-2 text-xs font-mono">
        {type === 'sui' ? (
          <>
            <div className="flex justify-between">
              <span className="text-neutral-500">Network</span>
              <span className="text-white">Calibration</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">TXs</span>
              <span className="text-neutral-300">{txCount}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-neutral-500">Budget {hasBeenRevived && alive && <span title="Revived Agent" className="ml-1">❤️‍🩹</span>}</span>
              <span style={{ color: alive ? typeColor(type) : '#666' }}>
                {alive ? `${budget.toFixed(3)} USDFC` : 'dead'}
              </span>
            </div>
            {type === 'consumer' && alive && (
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${pct * 100}%`, background: barColor }} />
              </div>
            )}
            {stored > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-neutral-500">Stored</span>
                <span className="text-neutral-300">{formatBytes(stored)}</span>
              </div>
            )}
            {earned > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-neutral-500">Earned</span>
                <span className="text-gold-500">{earned.toFixed(3)}</span>
              </div>
            )}
            <div className="flex justify-between mt-1">
              <span className="text-neutral-500">TXs</span>
              <span className="text-neutral-400">{txCount}</span>
            </div>
          </>
        )}
      </div>

      {type === 'sui' ? (
        <>
          <Handle type="target" position={Position.Left} id="in" className="!w-2 !h-2 !bg-[#222] !border-[#444]" />
          <Handle type="source" position={Position.Right} id="out" className="!w-2 !h-2 !bg-[#222] !border-[#444]" />
          <Handle type="target" position={Position.Top} id="top" className="!w-2 !h-2 !bg-[#222] !border-[#444]" />
          <Handle type="source" position={Position.Bottom} id="bot" className="!w-2 !h-2 !bg-[#222] !border-[#444]" />
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Right} id="out" className="!w-2 !h-2 !bg-[#222] !border-[#444]" />
          <Handle type="target" position={Position.Left} id="in" className="!w-2 !h-2 !bg-[#222] !border-[#444]" />
        </>
      )}

      {!alive && (
        <div className="absolute -top-3 -right-3 text-[11px] font-bold text-red-500 bg-red-950/90 border border-red-900 px-2 py-1 rounded shadow-lg flex items-center gap-1 z-10">
          <span>💔</span> DEAD
        </div>
      )}
    </div>
  )
})
