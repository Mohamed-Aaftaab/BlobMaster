'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap, BackgroundVariant,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type Connection,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { AgentNodeCard, type AgentNodeData } from '@/components/EconomyFlowNode'
import { TxFeed } from '@/components/TxFeed'
import { useAgentEvents, type AgentEvent } from '@/hooks/useAgentEvents'

const POSITIONS: Record<string, {x:number;y:number}> = {
  'producer-1': { x:  80, y:  60 },
  'producer-2': { x:  80, y: 280 },
  'producer-3': { x:  80, y: 500 },
  'sui':   { x: 480, y: 240 },
  'consumer-1': { x: 880, y:  60 },
  'consumer-2': { x: 880, y: 280 },
  'consumer-3': { x: 880, y: 500 },
  'guardian-1': { x: 460, y: 540 },
}

const TYPE_COLORS: Record<string, string> = {
  producer: '#fafafa', // white
  consumer: '#a1a1aa', // neutral-400
  guardian: '#d4af37', // metallic gold
  sui: '#52525b', // neutral-600
}

function makeEdge(id: string, source: string, target: string, color: string, label?: string): Edge {
  return {
    id, source, target,
    type: 'smoothstep',
    animated: true,
    label,
    labelStyle: { fill: color, fontSize: 9, fontFamily: 'monospace' },
    labelBgStyle: { fill: '#0d1018', fillOpacity: 0.8 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    style: { stroke: color + '66', strokeWidth: 1.8 },
  }
}

function agentToNode(a: any): Node<AgentNodeData> {
  const pos = POSITIONS[a.id] ?? { x: 400 + Math.random()*200-100, y: 300 + Math.random()*100 }
  return {
    id: a.id, type: 'agentNode', position: pos,
    data: {
      label: a.id, type: a.type,
      budget: a.budget, budgetTotal: a.budgetTotal,
      stored: a.storedBytes ?? 0,
      alive: a.state !== 'dead', pulsing: false,
      txCount: a.txCount ?? 0, earned: a.earned ?? 0,
    },
  }
}

function agentsToEdges(agents: any[]): Edge[] {
  const edges: Edge[] = []
  agents.filter(a => a.type === 'producer').forEach(a => {
    edges.push(makeEdge(`e-${a.id}-fc`, a.id, 'sui', TYPE_COLORS.producer, 'store →'))
  })
  agents.filter(a => a.type === 'consumer').forEach(a => {
    edges.push(makeEdge(`e-fc-${a.id}`, 'sui', a.id, TYPE_COLORS.consumer, '← retrieve'))
    edges.push(makeEdge(`e-${a.id}-fc-pay`, a.id, 'sui', '#aa44ff', 'pay →'))
  })
  agents.filter(a => a.type === 'guardian').forEach(a => {
    edges.push(makeEdge(`e-${a.id}-fc`, a.id, 'sui', TYPE_COLORS.guardian, 'extend →'))
  })
  return edges
}

const SUI_NODE: Node<AgentNodeData> = {
  id: 'sui', type: 'agentNode', position: POSITIONS['sui'],
  data: { label:'Sui', type:'sui', budget:0, budgetTotal:0, stored:0, alive:true, pulsing:false, txCount:0, earned:0 },
}

interface Stats { alive:number; dead:number; critical:number; totalUsdfc:number; totalStoredBytes:number; txCount:number }

function fmtBytes(b: number) {
  if (b>1e9) return `${(b/1e9).toFixed(1)} GB`
  if (b>1e6) return `${(b/1e6).toFixed(1)} MB`
  if (b>1e3) return `${(b/1e3).toFixed(0)} KB`
  return `${b} B`
}

export default function EconomyPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNodeData>([SUI_NODE])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [running, setRunning]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [stats, setStats]       = useState<Stats|null>(null)
  const [epoch, setEpoch]       = useState<number|null>(null)
  const [selected, setSelected] = useState<Node<AgentNodeData>|null>(null)
  const [walletBalance, setWalletBalance] = useState<string|null>(null)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<any>(null)
  const autoStopRef = useRef<any>(null)

  const nodeTypes = useMemo(() => ({ agentNode: AgentNodeCard }), [])

  useEffect(() => {
    const addr = '0x4e51EA274b9a6192B2BBB7734b6bE50bC7B4752B'
    fetch('https://sui-testnet.gateway.tatum.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'suix_getBalance', params:[addr] })
    })
    .then(r => r.json())
    .then(d => {
      if (d.result && d.result.totalBalance) setWalletBalance((Number(d.result.totalBalance)/1e9).toFixed(4) + ' SUI')
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    const iv = setInterval(() => fetch('/api/stats?scope=agents').then(r=>r.json()).then(s => {
      setStats(s)
      setNodes(nds => nds.map(n => n.id === 'sui' ? {...n, data:{...n.data, txCount: s.txCount}} : n))
    }).catch(()=>{}), 3000)
    fetch('/api/stats?scope=agents').then(r=>r.json()).then(setStats).catch(()=>{})
    fetch('https://sui-testnet.gateway.tatum.io', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',method:'suix_getLatestSuiSystemState',params:[],id:1}),
    }).then(r=>r.json()).then(d=>setEpoch(d?.result?.epoch??null)).catch(()=>{})
    return () => clearInterval(iv)
  }, [])

  const loadAgents = useCallback(() => {
    fetch('/api/agents').then(r=>r.json()).then((agents:any[]) => {
      if (!agents.length) return
      setNodes([SUI_NODE, ...agents.map(agentToNode)])
      setEdges(agentsToEdges(agents))
    }).catch(()=>{})
  }, [setNodes, setEdges])

  useEffect(() => { loadAgents() }, [loadAgents])

  useAgentEvents((event: AgentEvent) => {
    setNodes(nds => nds.map(n => {
      const ev = event as any
      if (n.id !== ev.agentId && n.id !== ev.from && n.id !== ev.to) return n
      const d = { ...n.data }
      switch (event.type) {
        case 'agent:store':
          if (n.id === ev.agentId) { d.stored += ev.bytes??0; d.pulsing=true; d.txCount++ }
          break
        case 'agent:pay':
          if (n.id === ev.from)  { d.budget=Math.max(0,d.budget-(ev.amount??0)); d.pulsing=true; d.txCount++ }
          if (n.id === ev.to)    { d.earned+=(ev.amount??0); d.pulsing=true }
          break
        case 'agent:extend':
          if (n.id === ev.agentId) { d.pulsing=true; d.txCount++ }
          break
        case 'agent:renew':
          if (n.id === ev.agentId) {
            d.budget = Math.max(0, d.budget - parseFloat(ev.costUsdc ?? '0'))
            d.pulsing = true; d.txCount++
          }
          break
        case 'agent:died':
          if (n.id === ev.agentId) { d.alive=false; d.pulsing=false }
          break
      }
      if (d.pulsing && event.type !== 'agent:died') {
        setTimeout(() => setNodes(ns => ns.map(nd =>
          nd.id===n.id ? {...nd,data:{...nd.data,pulsing:false}} : nd
        )), 2000)
      }
      return { ...n, data: d }
    }))

    const ev = event as any
    const fromId = ev.from ?? ev.agentId
    if (fromId) {
      const toId = ev.to ?? 'sui'
      const color = (event.type === 'agent:extend' || event.type === 'agent:renew') ? TYPE_COLORS.guardian
        : event.type === 'agent:pay' ? '#aa44ff'
        : event.type === 'agent:store' ? TYPE_COLORS.producer
        : TYPE_COLORS.consumer

      setEdges(eds => eds.map(e => {
        if (!((e.source===fromId&&e.target===toId)||(e.source===toId&&e.target===fromId))) return e
        const lit: Edge = {
          ...e, animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 20, height: 20 },
          style: { stroke: color, strokeWidth: 2.5, filter: `drop-shadow(0 0 6px ${color})` },
        }
        setTimeout(() => setEdges(es => es.map(ee =>
          ee.id===e.id ? {
            ...ee, animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
            style: { stroke: color + '66', strokeWidth: 1.8 },
          } : ee
        )), 2200)
        return lit
      }))
    }
  })

  const onConnect = useCallback((c:Connection) => setEdges(es=>addEdge(c,es)), [setEdges])

  async function startEconomy() {
    setLoading(true)
    await fetch('/api/economy/start', {method:'POST'})
    setRunning(true)
    setLoading(false)
    setTimeout(loadAgents, 600)

    // 2-minute countdown
    setCountdown(120)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(countdownRef.current); return 0 }
        return c - 1
      })
    }, 1000)

    // auto-stop after 2 minutes
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    autoStopRef.current = setTimeout(async () => {
      await fetch('/api/economy/stop', {method:'POST'})
      setRunning(false)
      setCountdown(0)
    }, 120_000)
  }

  async function stopEconomy() {
    setLoading(true)
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    await fetch('/api/economy/stop', {method:'POST'})
    setRunning(false)
    setCountdown(0)
    setLoading(false)
  }

  return (
    <div className="h-screen flex flex-col bg-transparent text-white overflow-hidden font-mono">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-[#222] bg-[#0a0a0a] rounded-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm tracking-tight">BlobMaster · Agent Vault</span>
          <span className="text-neutral-500 text-xs">Live Economy · 2-min Demo</span>
        </div>
        <span className="text-neutral-300 text-sm font-semibold tracking-wide">Sui Calibration</span>
        <div className="flex items-center gap-4 text-xs">
          {walletBalance && (
            <div className="flex items-center gap-1.5 text-yellow-400">
              <span>💰</span><span>{walletBalance}</span>
            </div>
          )}
          {epoch && <span className="text-[#3a4560]">Epoch {epoch.toLocaleString()}</span>}

          {/* Countdown timer */}
          {running && countdown > 0 && (
            <div className="flex items-center gap-1.5 text-gold-500 font-bold">
              <span>⏱</span>
              <span>{Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}</span>
            </div>
          )}

          <div className={`flex items-center gap-1.5 ${running?'text-white':'text-neutral-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${running?'bg-white animate-pulse shadow-[0_0_8px_#fff]':'bg-[#333]'}`}/>
            {running?'LIVE':'IDLE'} · Calibration
          </div>
          {!running ? (
            <button onClick={startEconomy} disabled={loading}
              className="bg-gold-500 text-black px-4 py-1.5 rounded-md text-xs font-semibold transition-all hover:bg-gold-400 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] disabled:opacity-40 flex items-center gap-1.5">
              <span>▶</span> Start (2 min)
            </button>
          ) : (
            <button onClick={stopEconomy} disabled={loading}
              className="border border-red-500/40 text-red-400 hover:bg-red-500/10 px-4 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-40">
              ■ Stop
            </button>
          )}
        </div>
      </div>

      {/* Legend bar */}
      <div className="flex items-center gap-6 px-5 h-8 border-b border-[#222] bg-black text-[10px] shrink-0">
        <span className="text-neutral-500 uppercase tracking-widest font-bold">Flow:</span>
        {[
          { color: '#fafafa', label: 'Producer → Store data' },
          { color: '#52525b', label: 'Sui → Consumer retrieve' },
          { color: '#a1a1aa', label: 'Consumer → Pay USDFC' },
          { color: '#d4af37', label: 'Guardian → extend CID' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div style={{ width: 24, height: 2, background: color, borderRadius: 1 }} />
            <span style={{ color }} className="opacity-80">{label}</span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-52 shrink-0 flex flex-col bg-black border-r border-[#222] overflow-y-auto">
          <div className="p-4 border-b border-[#222]">
            <div className="text-neutral-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">Agent Types</div>
            {[
              { type:'producer', label:'Producer', desc:'Stores data, earns USDFC', color:'#fafafa', icon:'⬤' },
              { type:'consumer', label:'Consumer', desc:'Retrieves, pays USDFC', color:'#a1a1aa', icon:'⬤' },
              { type:'guardian', label:'Guardian', desc:'Extends expiring Blobs', color:'#d4af37', icon:'◆' },
            ].map(a => (
              <div key={a.type} style={{ borderLeft: `2px solid ${a.color}55` }}
                className="flex items-start gap-2.5 px-2 py-2 rounded-r-md hover:bg-white/5 cursor-default mb-1 transition-colors">
                <span style={{color:a.color}} className="text-xs mt-0.5 shrink-0">{a.icon}</span>
                <div>
                  <div className="text-[11px] font-medium leading-tight" style={{color:a.color}}>{a.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-b border-[#222]">
            <div className="text-neutral-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">Stats</div>
            {stats ? (
              <div className="space-y-2">
                <SRow l="Alive"    v={stats.alive}                  c="text-white" />
                <SRow l="Dead"     v={stats.dead}                   c="text-red-500" />
                <SRow l="TXs"      v={stats.txCount}                c="text-neutral-300" />
                <SRow l="USDFC ↕"  v={stats.totalUsdfc.toFixed(3)} c="text-gold-500" />
                <SRow l="Storage"  v={fmtBytes(stats.totalStoredBytes)} c="text-neutral-300" />
              </div>
            ) : <div className="text-neutral-600 text-xs">—</div>}
          </div>

          {selected && selected.data.type !== 'sui' && (
            <div className="p-4">
              <div className="text-neutral-500 text-[10px] uppercase tracking-widest mb-3 font-semibold">Selected</div>
              <div className="bg-[#0a0a0a] p-3 border border-[#222] rounded-lg"
                style={{ borderLeftColor: TYPE_COLORS[selected.data.type] ?? '#333', borderLeftWidth: 3 }}>
                <div className="text-[11px] font-semibold mb-2" style={{ color: TYPE_COLORS[selected.data.type] ?? '#ccc' }}>
                  {selected.data.label}
                </div>
                <div className="space-y-1.5 text-[10px] text-slate-400">
                  <div className="flex justify-between"><span>Type</span><span className="text-slate-300">{selected.data.type}</span></div>
                  <div className="flex justify-between"><span>Budget</span><span className="text-slate-300">{selected.data.budget.toFixed(3)} USDFC</span></div>
                  <div className="flex justify-between"><span>Stored</span><span className="text-slate-300">{fmtBytes(selected.data.stored)}</span></div>
                  <div className="flex justify-between"><span>TXs</span><span className="text-slate-300">{selected.data.txCount}</span></div>
                  <div className="flex justify-between"><span>Status</span>
                    <span className={selected.data.alive?'text-white':'text-red-500'}>
                      {selected.data.alive?'● Alive':'✕ Dead'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas + TX feed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect} nodeTypes={nodeTypes}
              onNodeClick={(_, n) => setSelected(n as Node<AgentNodeData>)}
              fitView fitViewOptions={{ padding: 0.18 }}
              defaultEdgeOptions={{ type:'smoothstep' }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#16bec8" style={{opacity: 0.15}} />
              <Controls className="glass-panel" style={{border:'1px solid rgba(255,255,255,0.05)',borderRadius:8}} />
              <MiniMap
                nodeColor={(n:any) => {
                  const color = TYPE_COLORS[n.data?.type as string]
                  return color ? `${color}88` : '#33404f'
                }}
                className="glass-panel"
                style={{border:'1px solid rgba(255,255,255,0.05)',borderRadius:8}}
              />
            </ReactFlow>

            {!running && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center bg-black/80 backdrop-blur-md px-10 py-7 rounded-2xl border border-[#333]">
                  <div className="text-white text-sm mb-1 font-semibold">Agent economy not running</div>
                  <div className="text-neutral-500 text-xs">Click ▶ Start (2 min) to spawn agents</div>
                </div>
              </div>
            )}
          </div>

          <div className="h-28 border-t border-[#222] bg-black rounded-none shrink-0">
            <div className="text-neutral-500 text-[10px] uppercase tracking-widest px-4 pt-2.5 pb-1 font-semibold">TX Feed</div>
            <TxFeed />
          </div>
        </div>
      </div>
    </div>
  )
}

function SRow({ l, v, c }: { l:string; v:any; c:string }) {
  return (
    <div className="flex justify-between text-[10px] font-mono">
      <span className="text-slate-500">{l}</span>
      <span className={c}>{v}</span>
    </div>
  )
}
