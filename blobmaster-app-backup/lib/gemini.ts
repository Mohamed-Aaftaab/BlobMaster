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
  listings:    { cid: string; agentId: string; pricePerRetrieve: string; bytes: number }[]
  ownedCIDs:   string[]
}

export interface AgentDecision {
  action:   'store' | 'retrieve' | 'repin' | 'wait' | 'prune'
  reason:   string
  targetCid?: string
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
- Budget: ${ctx.budget.toFixed(4)} USDFC (${budgetPct}% remaining of ${ctx.budgetTotal})
- Stored bytes: ${(ctx.storedBytes / 1e6).toFixed(2)} MB
- Transaction count: ${ctx.txCount}
- CIDs you own: ${ctx.ownedCIDs.length > 0 ? ctx.ownedCIDs.slice(0,3).join(', ') : 'none'}

Available datasets to retrieve:
${ctx.listings.length > 0
  ? ctx.listings.slice(0,5).map(l => `- CID: ${l.cid} | Owner: ${l.agentId} | Price: ${l.pricePerRetrieve} USDFC | Size: ${(l.bytes/1e6).toFixed(1)} MB`).join('\n')
  : '- none available yet'}

Your role as a ${ctx.agentType}:
${ctx.agentType === 'producer'  ? '- Store valuable datasets on Sui to earn USDFC from retrievals\n- Generate synthetic datasets (climate data, genomics, market feeds, IoT telemetry)\n- Keep storing new data as budget allows' : ''}
${ctx.agentType === 'consumer'  ? '- Retrieve datasets from producers to power your AI computations\n- Buy cheapest available datasets\n- Stop when budget is critically low (<10%)' : ''}
${ctx.agentType === 'guardian'  ? '- Monitor real Sui storage blobs using the BlobMaster SDK\n- Call repin when blobs are expiring (needsRenewal=true) to trigger x402 renewal via BlobMaster\n- Call wait when all blobs are healthy (active)\n- You earn USDFC fees for each renewal you perform' : ''}

Decide what to do next. Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{
  "action": "store" | "retrieve" | "repin" | "wait" | "prune",
  "reason": "brief one-sentence explanation of why",
  "targetCid": "optional — CID to retrieve/repin (pick from listings above)",
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
      consumer: { action: ctx.listings.length>0 ? 'retrieve' : 'wait', reason:'Fallback: retrieving cheapest', targetCid: ctx.listings[0]?.cid },
      guardian: { action:'repin', reason:'Fallback: checking random CID', targetCid: ctx.ownedCIDs[0] ?? ctx.listings[0]?.cid },
    }
    return fallbacks[ctx.agentType] ?? { action:'wait', reason:'No action needed' }
  }
}
