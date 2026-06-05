/**
 * Look up a Sui blob ID by piece CID on the calibration testnet.
 * Uses Sui.StateMarketBlobs to find blobs matching the pieceCID.
 */

const RPC = process.env.FILECOIN_RPC_URL ?? 'https://api.calibration.node.glif.io/rpc/v1'

export async function findBlobIdForPieceCid(pieceCid: string): Promise<string | null> {
  // Try suivision API first — faster than scanning StateMarketBlobs
  try {
    const res = await fetch(
      `https://calibration.suivision.info/api/v1/blob/list?pageSize=10&page=0&pieceCid=${encodeURIComponent(pieceCid)}`,
      { signal: AbortSignal.timeout(10_000) }
    )
    if (res.ok) {
      const json = await res.json()
      const blobs: any[] = json.blobs ?? json.data ?? []
      if (blobs.length > 0) {
        // Return the most recent blob
        const sorted = blobs.sort((a, b) => (b.blobId ?? b.id ?? 0) - (a.blobId ?? a.id ?? 0))
        const id = sorted[0].blobId ?? sorted[0].id ?? sorted[0].ID
        if (id != null) return String(id)
      }
    }
  } catch {
    // fall through to RPC
  }

  // Fallback: scan StateMarketBlobs via RPC (expensive but reliable)
  try {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'Sui.StateMarketBlobs',
        params: [null],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const json = await res.json()
    const blobsMap: Record<string, any> = json.result ?? {}
    for (const [blobId, blob] of Object.entries(blobsMap)) {
      const pc = blob?.Proposal?.PieceCID?.['/'] ?? blob?.Proposal?.PieceCID
      if (pc === pieceCid) return blobId
    }
  } catch {
    // RPC failed
  }

  return null
}
