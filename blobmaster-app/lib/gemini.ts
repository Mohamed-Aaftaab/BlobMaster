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

const MODEL = 'gemini-1.5-flash'

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
  if (logs.length === 0) return 'No errors recorded recently. The system is healthy! 🟢'
  
  const genai = getGenAI()
  const model = genai.getGenerativeModel({ model: MODEL })
  
  const prompt = `You are an expert DevOps engineer monitoring the BlobMaster decentralized storage platform.
Analyze the following JSON log of recent system errors from both the frontend UI and the decentralized Keeper daemon.

Logs:
${JSON.stringify(logs.slice(0, 50), null, 2)}

Provide a concise, human-readable "System Health Report" formatted in Markdown.
Identify any recurring patterns (e.g. users forgetting to fund their wallets, Walrus network congestion) and provide actionable recommendations. Keep it under 300 words. Use emojis.`

  try {
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (e: any) {
    return `⚠️ Failed to generate AI diagnostics: ${e.message}`
  }
}
