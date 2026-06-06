import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const apiKey = process.env.TATUM_API_KEY || process.env.NEXT_PUBLIC_TATUM_API_KEY || ''
    
    // We proxy the request to Tatum Testnet, injecting the API key header securely on the server
    const rpcUrl = 'https://sui-testnet.gateway.tatum.io'
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (apiKey) {
      headers['x-api-key'] = apiKey
    }
    
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[RPC Proxy Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
