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
    <section className="border-t border-b border-gray-800 py-12">
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 gap-8">
        <div>
          <div className="text-4xl font-bold text-green-400">{renewals}</div>
          <div className="text-gray-500 mt-1">blobs renewed</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-green-400">{autopilots}</div>
          <div className="text-gray-500 mt-1">on autopilot</div>
        </div>
      </div>
    </section>
  )
}
