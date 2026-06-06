'use client'

import { useState } from 'react'

export default function DiagnosticsPage() {
  const [report, setReport] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logsCount, setLogsCount] = useState<number | null>(null)

  async function generateReport() {
    setLoading(true)
    setError(null)
    setReport('')
    try {
      const res = await fetch('/api/diagnostics')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate report')
      setReport(data.report)
      setLogsCount(data.logsCount)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-transparent p-4 sm:p-8 text-slate-200">
      <div className="max-w-3xl mx-auto font-sans">
        <div className="mb-8 border-b border-[#333] pb-4">
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">AI Diagnostics 🩺</h1>
          <p className="text-slate-400 text-sm">
            Powered by Gemini. Analyzes recent telemetry errors from the BlobMaster frontend and decentralized keeper daemons.
          </p>
        </div>

        <button
          onClick={generateReport}
          disabled={loading}
          className="bg-amber-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed mb-8"
        >
          {loading ? 'Analyzing Telemetry Logs...' : 'Generate System Health Report'}
        </button>

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 mb-6">
            ⚠️ {error}
          </div>
        )}

        {report && (
          <div className="glass-panel p-6 bg-white/[0.02]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">System Health Report</h2>
              <span className="text-xs text-slate-500 font-mono">Analyzed {logsCount} events</span>
            </div>
            
            <div className="prose prose-invert prose-amber max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-300">
              {report}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
