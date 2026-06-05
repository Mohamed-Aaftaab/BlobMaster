'use client'
import { useCallback, useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Lottie from 'lottie-react'
import { useAgentEvents, type AgentEvent } from '@/hooks/useAgentEvents'
import { makeOrbitAnimation, makePulseAnimation } from '@/lib/lottie-animations'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

export interface AgentNode {
  id: string; type: 'producer'|'consumer'|'guardian'|'sui'
  label: string; budget: number; budgetTotal: number
  stored: number; alive: boolean; pulsing: boolean; val: number
  x?: number; y?: number; vx?: number; vy?: number
}

export interface AgentLink {
  source: string|AgentNode; target: string|AgentNode
  type: 'store'|'retrieve'|'repin'|'warning'|'pay'; active: boolean; amount: number
}

interface Props { onNodeClick?: (node: AgentNode) => void }

function nodeColor(t: string) { return ({producer:'#00ff88',consumer:'#4488ff',guardian:'#ff8800',sui:'#0090ff'} as any)[t]??'#888' }
function linkColor(t: string) { return ({store:'#00ff88',retrieve:'#4488ff',repin:'#ff8800',warning:'#ff4444',pay:'#4488ff'} as any)[t]??'#fff' }
function animForType(t: string) {
  if (t === 'producer') return makePulseAnimation('#00ff88', 'producer')
  if (t === 'consumer') return makePulseAnimation('#4488ff', 'consumer')
  if (t === 'guardian') return makeOrbitAnimation('#ff8800')
  return null
}
function nodeId(n: string|AgentNode): string { return typeof n==='string'?n:n.id }

const FILECOIN_NODE: AgentNode = {
  id:'sui',type:'sui',label:'Sui',
  budget:0,budgetTotal:0,stored:0,alive:true,pulsing:false,val:20,
}

// ── Lottie overlay ────────────────────────────────────────────────────────────
function LottieOverlay({ nodes, w, h }: { nodes: AgentNode[]; w: number; h: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {nodes.map(node => {
        if (node.type === 'sui' || node.x == null || node.y == null) return null
        const anim = animForType(node.type)
        if (!anim) return null
        const size    = node.alive ? Math.max(32, (node.val ?? 10) * 4.5) : 22
        const opacity = node.alive ? 1 : 0.18
        const cx      = node.x + w / 2
        const cy      = node.y + h / 2
        const glowClr = nodeColor(node.type)
        return (
          <div
            key={node.id}
            className="absolute"
            style={{
              left:       cx - size / 2,
              top:        cy - size / 2,
              width:      size,
              height:     size,
              opacity,
              filter:     node.pulsing
                ? `drop-shadow(0 0 12px ${glowClr}) drop-shadow(0 0 24px ${glowClr})`
                : `drop-shadow(0 0 4px ${glowClr}66)`,
              transition: 'opacity 1.2s ease, filter 0.4s ease, width 0.5s ease, height 0.5s ease, left 0.1s linear, top 0.1s linear',
            }}
          >
            <Lottie
              animationData={anim}
              loop={true}
              autoplay={node.alive}
              style={{ width: '100%', height: '100%' }}
            />
            {/* Budget arc for consumers */}
            {node.type === 'consumer' && node.alive && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="47"
                  fill="none"
                  stroke={node.budget/node.budgetTotal < 0.2 ? '#ff4444' : '#4488ff'}
                  strokeWidth="4"
                  strokeDasharray={`${(node.budget/Math.max(node.budgetTotal,0.001))*295} 295`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  opacity="0.75"
                  style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
              </svg>
            )}
            {/* Dead X overlay */}
            {!node.alive && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs font-bold">✕</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AgentNetwork({ onNodeClick }: Props) {
  const graphRef     = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims]         = useState({ w: 800, h: 600 })
  const [overlayNodes, setOverlayNodes] = useState<AgentNode[]>([])
  const [graphData, setGraphData] = useState<{nodes:AgentNode[];links:AgentLink[]}>({
    nodes: [FILECOIN_NODE], links: [],
  })

  // Track container size
  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const ro = new ResizeObserver(e => {
      const r = e[0].contentRect; setDims({ w: r.width, h: r.height })
    })
    ro.observe(el)
    setDims({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Magnetic d3 forces — run after graph initialises
  const applyForces = useCallback(() => {
    const fg = graphRef.current; if (!fg) return
    try {
      // Very strong link force — agents snap tightly together
      fg.d3Force('link')?.strength(0.9).distance(55)
      // Repulsion keeps them from fully collapsing
      fg.d3Force('charge')?.strength(-160)
      // Gentle center pull
      fg.d3Force('center')?.strength(0.04)
      fg.d3ReheatSimulation()
    } catch {}
  }, [])

  // Load initial agent state
  useEffect(() => {
    fetch('/api/agents').then(r=>r.json()).then((agents:any[]) => {
      if (!agents.length) return
      const nodes: AgentNode[] = [FILECOIN_NODE, ...agents.map(a => ({
        id: a.id, type: a.type as AgentNode['type'], label: a.id,
        budget: a.budget, budgetTotal: a.budgetTotal, stored: a.storedBytes,
        alive: a.state !== 'dead', pulsing: false,
        val: a.type==='consumer' ? 6+(a.budget/Math.max(a.budgetTotal,1))*12 : 10,
      }))]
      const links: AgentLink[] = agents.map(a => ({
        source:a.id, target:'sui', type:'store' as const, active:false, amount:0,
      }))
      setGraphData({ nodes, links })
      setOverlayNodes(nodes)
      setTimeout(applyForces, 300)
    }).catch(()=>{})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SSE live updates
  useAgentEvents((event: AgentEvent) => {
    setGraphData(prev => {
      const nodes = prev.nodes.map(n=>({...n}))
      const links = prev.links.map(l=>({...l}))

      const ensureNode = (id: string, type: AgentNode['type']) => {
        if (!nodes.find(n=>n.id===id)) {
          nodes.push({id,type,label:id,budget:10,budgetTotal:10,stored:0,alive:true,pulsing:false,val:10})
          links.push({source:id,target:'sui',type:'store',active:false,amount:0})
        }
      }

      switch (event.type) {
        case 'agent:pay': {
          const {from,to} = event as any
          ensureNode(from,'consumer'); ensureNode(to,'producer')
          let lnk = links.find(l=>nodeId(l.source)===from && nodeId(l.target)===to)
          if (!lnk) { lnk={source:from,target:to,type:'retrieve',active:true,amount:event.amount??0}; links.push(lnk) }
          else lnk.active=true
          const c=nodes.find(n=>n.id===from)
          if (c) { c.budget=Math.max(0,c.budget-(event.amount??0)); c.val=6+(c.budget/Math.max(c.budgetTotal,1))*12; c.pulsing=true }
          const p=nodes.find(n=>n.id===to); if(p) p.pulsing=true
          setTimeout(()=>setGraphData(g=>{
            const u={nodes:g.nodes.map(n=>({...n})),links:g.links.map(l=>({...l}))}
            const l=u.links.find(lk=>nodeId(lk.source)===from&&nodeId(lk.target)===to)
            if(l) l.active=false
            u.nodes.forEach(n=>{ if(n.id===from||n.id===to) n.pulsing=false })
            return u
          }),2000)
          break
        }
        case 'agent:store': {
          ensureNode(event.agentId!,'producer')
          const p=nodes.find(n=>n.id===event.agentId)
          if(p){p.stored+=(event.bytes??0);p.val=Math.min(20,p.val+0.3);p.pulsing=true}
          const sl=links.find(l=>nodeId(l.source)===event.agentId&&nodeId(l.target)==='sui')
          if(sl) sl.active=true
          setTimeout(()=>setGraphData(g=>{
            const u={nodes:g.nodes.map(n=>({...n})),links:g.links.map(l=>({...l}))}
            const l=u.links.find(lk=>nodeId(lk.source)===event.agentId&&nodeId(lk.target)==='sui')
            if(l) l.active=false
            u.nodes.forEach(n=>{ if(n.id===event.agentId) n.pulsing=false })
            return u
          }),2000)
          break
        }
        case 'agent:repin': {
          ensureNode(event.agentId!,'guardian')
          const g=nodes.find(n=>n.id===event.agentId); if(g) g.pulsing=true
          const rl=links.find(l=>nodeId(l.source)===event.agentId)
          if(rl){rl.active=true;rl.type='repin'}
          setTimeout(()=>setGraphData(gd=>{
            const u={nodes:gd.nodes.map(n=>({...n})),links:gd.links.map(l=>({...l}))}
            const l=u.links.find(lk=>nodeId(lk.source)===event.agentId)
            if(l) l.active=false
            u.nodes.forEach(n=>{ if(n.id===event.agentId) n.pulsing=false })
            return u
          }),2500)
          break
        }
        case 'agent:died': {
          const n=nodes.find(n=>n.id===event.agentId)
          if(n){n.alive=false;n.pulsing=false;n.val=4}
          links.forEach(l=>{
            if(nodeId(l.source)===event.agentId||nodeId(l.target)===event.agentId) l.active=false
          })
          break
        }
      }

      setOverlayNodes(nodes)
      return {nodes,links}
    })
  })

  // Sync overlay positions via rAF
  useEffect(() => {
    let raf: number
    const sync = () => {
      const fg = graphRef.current
      if (fg) {
        try {
          const gd = fg.graphData()
          if (gd?.nodes) setOverlayNodes((gd.nodes as AgentNode[]).map(n=>({...n})))
        } catch {}
      }
      raf = requestAnimationFrame(sync)
    }
    raf = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Canvas painter — Sui hexagon + transparent click targets for others
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
    const r = node.val??8; const x=node.x??0; const y=node.y??0
    if (node.type==='sui') {
      ctx.shadowBlur=18; ctx.shadowColor='#0090ff'
      ctx.beginPath()
      for(let i=0;i<6;i++){
        const a=(Math.PI/3)*i-Math.PI/6
        i===0?ctx.moveTo(x+(r+5)*Math.cos(a),y+(r+5)*Math.sin(a))
             :ctx.lineTo(x+(r+5)*Math.cos(a),y+(r+5)*Math.sin(a))
      }
      ctx.closePath()
      ctx.fillStyle='#0090ff'; ctx.fill()
      ctx.strokeStyle='#55ccff'; ctx.lineWidth=1.5; ctx.stroke()
      ctx.shadowBlur=0
      ctx.fillStyle='rgba(136,204,255,0.9)'; ctx.font='6px monospace'; ctx.textAlign='center'
      ctx.fillText('FILECOIN',x,y+r+15)
    } else {
      // Transparent hit target — Lottie renders the visual
      ctx.beginPath(); ctx.arc(x,y,r+4,0,2*Math.PI)
      ctx.fillStyle='rgba(0,0,0,0)'; ctx.fill()
      ctx.shadowBlur=0
      ctx.fillStyle=node.alive?'rgba(255,255,255,0.55)':'rgba(80,80,80,0.4)'
      ctx.font='5.5px monospace'; ctx.textAlign='center'
      ctx.fillText(node.label,x,y+r+13)
    }
    ctx.shadowBlur=0
  },[])

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const x1=(typeof link.source==='object'?link.source.x:0)??0
    const y1=(typeof link.source==='object'?link.source.y:0)??0
    const x2=(typeof link.target==='object'?link.target.x:0)??0
    const y2=(typeof link.target==='object'?link.target.y:0)??0
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2)
    if(link.active){
      ctx.strokeStyle=linkColor(link.type); ctx.lineWidth=1.5
      ctx.shadowBlur=8; ctx.shadowColor=linkColor(link.type)
    } else {
      ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=0.5; ctx.shadowBlur=0
    }
    ctx.stroke(); ctx.shadowBlur=0
  },[])

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#080c14]">
      {/* CSS nebula background */}
      <div className="nebula-bg z-0">
        <div className="nebula-orb nebula-orb-1" />
        <div className="nebula-orb nebula-orb-2" />
        <div className="nebula-orb nebula-orb-3" />
        {/* Subtle star field */}
        <StarField />
      </div>

      {/* Force graph */}
      <div className="absolute inset-0 z-10">
        <ForceGraph2D
          ref={graphRef}
          width={dims.w}
          height={dims.h}
          graphData={graphData}
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={()=>'replace'}
          linkCanvasObject={paintLink}
          linkCanvasObjectMode={()=>'replace'}
          backgroundColor="transparent"
          linkDirectionalParticles={(l:any)=>l.active?5:0}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={(l:any)=>linkColor(l.type)}
          linkDirectionalParticleSpeed={0.005}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.15}
          onNodeClick={(n:any)=>onNodeClick?.(n)}
          onEngineStop={applyForces}
          nodeVal={(n:any)=>n.val??8}
          cooldownTicks={120}
        />
      </div>

      {/* Lottie overlays */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <LottieOverlay nodes={overlayNodes} w={dims.w} h={dims.h} />
      </div>
    </div>
  )
}

// Tiny SVG star field for depth
function StarField() {
  const stars = Array.from({length:60},(_,i)=>({
    x: ((i*137.5)%100).toFixed(1),
    y: ((i*73.1+17)%100).toFixed(1),
    r: (0.5+(i%3)*0.4).toFixed(1),
    o: (0.2+(i%5)*0.1).toFixed(2),
  }))
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {stars.map((s,i)=>(
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} fill="white" opacity={s.o} />
      ))}
    </svg>
  )
}
