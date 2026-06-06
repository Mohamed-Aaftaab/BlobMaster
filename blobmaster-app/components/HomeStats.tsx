'use client'

import { useEffect, useState } from 'react'

export function HomeStats({
  initialRenewals,
  initialAutopilots,
}: {
  initialRenewals: number
  initialAutopilots: number
}) {
  const [renewals, setRenewals] = useState(initialRenewals)
  const [autopilots, setAutopilots] = useState(initialAutopilots)

  useEffect(() => {
    function syncFromStorage() {
      const renewed = Number.parseInt(window.localStorage.getItem('blobmaster_blobsRenewed') ?? '', 10)
      const autos = Number.parseInt(window.localStorage.getItem('blobmaster_autopilotCount') ?? '', 10)
      if (!Number.isNaN(renewed)) setRenewals(renewed)
      if (!Number.isNaN(autos)) setAutopilots(autos)
    }

    syncFromStorage()
    const iv = window.setInterval(syncFromStorage, 1000)
    return () => window.clearInterval(iv)
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-panel p-8 text-center hover:bg-white/10 transition-colors flex flex-col items-center justify-center">
        <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blob-cyan to-white drop-shadow-md tracking-tighter">
          {renewals}
        </div>
        <div className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-sm">Blobs Extended</div>
      </div>
      <div className="glass-panel p-8 text-center hover:bg-white/10 transition-colors flex flex-col items-center justify-center">
        <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blob-teal to-white drop-shadow-md tracking-tighter">
          {autopilots}
        </div>
        <div className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-sm">Active Autopilots</div>
      </div>
    </div>
  )
}
