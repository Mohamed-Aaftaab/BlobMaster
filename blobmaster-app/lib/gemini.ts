import { GoogleGenerativeAI } from '@google/generative-ai'

let _genai: GoogleGenerativeAI | null = null

function getGenAI() {
  if (!_genai) {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('GEMINI_API_KEY not set')
    _genai = new GoogleGenerativeAI(key)
  }
  return _genai
}

export interface AgentContext {
  agentId:     string
  agentType:   'producer' | 'consumer' | 'guardian'
  budget:      number
  budgetTotal: number
  storedBytes: number
  txCount:     number
  listings:    { blobId: string; agentId: string; pricePerRetrieve: string; bytes: number }[]
  activeBlobIds:   string[]
  hasBeenRevived?: boolean
}

export interface AgentDecision {
  action:   'store' | 'retrieve' | 'extend' | 'wait' | 'prune'
  reason:   string
  targetBlobId?: string
  dataToStore?: string  // JSON dataset to store
}

const MODEL = 'gemini-pro'

export async function getAgentDecision(ctx: AgentContext): Promise<AgentDecision> {
  const genai = getGenAI()
  const model = genai.getGenerativeModel({ model: MODEL })

  const budgetPct = ((ctx.budget / ctx.budgetTotal) * 100).toFixed(0)

  const prompt = `You are an autonomous AI agent on the Sui decentralized storage network.

Your identity:
- Agent ID: ${ctx.agentId}
- Type: ${ctx.agentType}
- Budget: ${ctx.budget.toFixed(4)} SUI (${budgetPct}% remaining of ${ctx.budgetTotal})
- Stored bytes: ${(ctx.storedBytes / 1e6).toFixed(2)} MB
- Transaction count: ${ctx.txCount}
- Blob IDs you own: ${ctx.activeBlobIds.length > 0 ? ctx.activeBlobIds.slice(0,3).join(', ') : 'none'}
${ctx.hasBeenRevived ? '- ⚠️ CRITICAL STATUS: You previously went bankrupt and died. You were just revived by a network bailout. You are on your second life. Be extremely conservative with your SUI budget and prioritize earning over spending.' : ''}

Available datasets to retrieve:
${ctx.listings.length > 0
  ? ctx.listings.slice(0,5).map(l => `- Blob ID: ${l.blobId} | Owner: ${l.agentId} | Price: ${l.pricePerRetrieve} SUI | Size: ${(l.bytes/1e6).toFixed(1)} MB`).join('\n')
  : '- none available yet'}

Your role as a ${ctx.agentType}:
${ctx.agentType === 'producer'  ? '- Store valuable datasets on Walrus to earn SUI from retrievals\n- Generate synthetic datasets (climate data, genomics, market feeds, IoT telemetry)\n- Keep storing new data as budget allows' : ''}
${ctx.agentType === 'consumer'  ? '- Retrieve datasets from producers to power your AI computations\n- Buy cheapest available datasets\n- Stop when budget is critically low (<10%)' : ''}
${ctx.agentType === 'guardian'  ? '- Monitor real Walrus storage blobs using the BlobMaster SDK\n- Call extend when blobs are expiring (needsRenewal=true) to trigger renewal via BlobMaster smart contract\n- Call wait when all blobs are healthy (active)\n- You earn SUI fees for each renewal you perform' : ''}

Decide what to do next. Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "action": "store" | "retrieve" | "extend" | "wait" | "prune",
  "reason": "brief one-sentence explanation of why",
  "targetBlobId": "optional — Blob ID to retrieve/extend (pick from listings above)",
  "dataToStore": "optional — if action=store, a compact JSON string representing the dataset (keep under 200 chars)"
}`

  try {
    const result = await model.generateContent(prompt)
    const text   = result.response.text().trim()
    // Strip markdown code fences if present
    const clean  = text.replace(/^```json\n?/,'').replace(/\n?```$/,'').trim()
    return JSON.parse(clean) as AgentDecision
  } catch (e: any) {
    console.warn(`[gemini] ${ctx.agentId} decision failed:`, e.message)
    // Safe fallback
    const fallbacks: Record<string, AgentDecision> = {
      producer: { action:'store', reason:'Fallback: storing default dataset', dataToStore:'{"type":"fallback","ts":' + Date.now() + '}' },
      consumer: { action: ctx.listings.length>0 ? 'retrieve' : 'wait', reason:'Fallback: retrieving cheapest', targetBlobId: ctx.listings[0]?.blobId },
      guardian: { action:'extend', reason:'Fallback: checking random Blob', targetBlobId: ctx.activeBlobIds[0] ?? ctx.listings[0]?.blobId },
    }
    return fallbacks[ctx.agentType] ?? { action:'wait', reason:'No action needed' }
  }
}

export async function generateDiagnosticsReport(logs: any[]): Promise<string> {
  if (logs.length === 0) return '## 🟢 System Healthy\n\nNo errors recorded recently. All BlobMaster frontend and Keeper daemon operations are running normally.'

  // ── Analyze logs in code (always works, no AI key needed) ──────────────────
  const total     = logs.length
  const byType    = logs.reduce((acc: any, l: any) => { acc[l.type] = (acc[l.type] || 0) + 1; return acc }, {})
  const bySource  = logs.reduce((acc: any, l: any) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc }, {})
  const byMsg     = logs.reduce((acc: any, l: any) => { const k = (l.message||'').slice(0,60); acc[k] = (acc[k]||0)+1; return acc }, {})
  const topErrors = Object.entries(byMsg).sort((a:any,b:any)=>b[1]-a[1]).slice(0,3)
  const recent    = logs[0]
  const oldest    = logs[logs.length - 1]
  const spanMs    = (recent?.timestamp || 0) - (oldest?.timestamp || 0)
  const spanMins  = Math.round(spanMs / 60000)

  const hasWalletErr  = logs.some((l:any) => (l.message||'').toLowerCase().includes('password') || (l.message||'').toLowerCase().includes('wallet'))
  const hasNetworkErr = logs.some((l:any) => (l.message||'').toLowerCase().includes('rate') || (l.message||'').toLowerCase().includes('network') || (l.message||'').toLowerCase().includes('tojson'))
  const hasBlobErr    = logs.some((l:any) => (l.message||'').toLowerCase().includes('blob') || (l.message||'').toLowerCase().includes('walrus'))
  const hasKeeperErr  = logs.some((l:any) => l.source === 'keeper')

  const typeList  = Object.entries(byType).map(([k,v]) => `- \`${k}\`: **${v}** events`).join('\n')
  const errList   = topErrors.map(([k,v]) => `- "${k}…" — **${v}x**`).join('\n')

  let insights = ''
  if (hasWalletErr)  insights += '\n### 🔐 Wallet Authentication Issues\nMultiple wallet signing errors detected. This is typically caused by a locked or corrupted browser wallet extension. **Recommendation:** Users should unlock their wallet before initiating transactions, or use the private-key bypass mode.\n'
  if (hasNetworkErr) insights += '\n### 🌐 Network Rate Limiting\nSui RPC rate-limit errors detected. The network is throttling requests. **Recommendation:** The RPC proxy failover to rpcpool.com is handling this automatically.\n'
  if (hasBlobErr)    insights += '\n### 📦 Walrus Blob Errors\nBlob storage/retrieval errors detected. **Recommendation:** Verify Walrus publisher endpoint is reachable and blob IDs are valid base64url strings.\n'
  if (hasKeeperErr)  insights += '\n### 🤖 Keeper Daemon Issues\nKeeper daemon reported errors. **Recommendation:** Check the keeper process logs and ensure it has sufficient SUI balance to pay renewal gas fees.\n'
  if (!insights)     insights  = '\n### ✅ No Critical Patterns\nNo recurring critical patterns identified. Errors appear isolated and non-systemic.\n'

  const baseReport = `## 📊 BlobMaster System Health Report
*Analyzed **${total} events** over the last **${spanMins > 0 ? spanMins + ' minutes' : 'session'}***

---

### 📈 Event Breakdown by Type
${typeList}

### 🔴 Top Recurring Errors
${errList || '- No recurring errors'}

### 🏠 Events by Source
- Frontend UI: **${bySource['frontend'] || 0}** events
- Keeper Daemon: **${bySource['keeper'] || 0}** events
${insights}
---
*Report generated at ${new Date().toUTCString()} · BlobMaster AI Diagnostics*`

  // ── Try Gemini as a bonus for a richer report ──────────────────────────────
  try {
    const genai = getGenAI()
    const model = genai.getGenerativeModel({ model: MODEL })
    const prompt = `You are an expert DevOps engineer. Analyze these BlobMaster decentralized storage platform logs and provide a concise health report in Markdown with emojis. Under 200 words.\n\nLogs:\n${JSON.stringify(logs.slice(0, 20), null, 2)}`
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch {
    // Gemini unavailable — return the code-generated report (always works)
    return baseReport
  }
}
