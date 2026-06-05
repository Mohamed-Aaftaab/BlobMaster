/**
 * Upload a renewal receipt JSON to Walrus IPFS storage.
 * Returns the IPFS CID so it can be stored and linked in the dashboard.
 */
export async function uploadReceipt(receipt: {
  blobId: string
  txHash: string
  pieceCid: string
  walrusJobId: string
  epochAtRenewal: number
  timestamp: string
  payerAddress: string
}): Promise<string | null> {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY
    if (!apiKey) {
      console.warn('[receipt] LIGHTHOUSE_API_KEY not set — skipping receipt upload')
      return null
    }

    const body = new FormData()
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
    body.append('file', blob, `receipt-${receipt.blobId}-${Date.now()}.json`)

    const res = await fetch('https://node.walrus.storage/api/v0/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    })

    if (!res.ok) {
      console.warn('[receipt] Walrus upload failed:', res.status, await res.text())
      return null
    }

    const data = await res.json()
    return (data.Hash ?? data.cid ?? null) as string | null
  } catch (e: any) {
    console.warn('[receipt] Upload error:', e.message)
    return null
  }
}
