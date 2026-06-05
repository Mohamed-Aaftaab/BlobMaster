import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dev Docs · BlobMaster',
  description: 'How to use blobmaster-sdk in a real project, plus setup, env, deploy, and API routes.',
}

const envRows = [
  { key: 'FILECOIN_WALLET_PRIVATE_KEY', required: 'yes', where: 'Renew/Autopilot signing', note: 'Must be 0x + 64 hex chars.' },
  { key: 'STORKEEP_WALLET_ADDRESS', required: 'yes', where: 'Payment wallet identity', note: 'Public 0x address (42 chars).' },
  { key: 'FILECOIN_RPC_URL', required: 'yes', where: 'Chain read/write', note: 'Calibration: https://api.calibration.node.glif.io/rpc/v1' },
  { key: 'NEXT_PUBLIC_APP_URL', required: 'yes', where: 'App API calls in prod', note: 'Set to your Vercel domain.' },
  { key: 'APP_URL', required: 'recommended', where: 'Server-side URL fallback', note: 'Usually same value as NEXT_PUBLIC_APP_URL.' },
  { key: 'LIGHTHOUSE_RAAS_CONTRACT', required: 'recommended', where: 'native extension renew calls', note: 'Use calibrated contract address.' },
  { key: 'STORKEEP_REGISTRY_CONTRACT', required: 'optional', where: 'On-chain registry writes', note: 'If unset, registry write is skipped.' },
  { key: 'CRON_SECRET', required: 'recommended', where: '/api/cron protection', note: 'Use a long random secret.' },
  { key: 'POSTGRES_PRISMA_URL', required: 'optional', where: 'DB-backed features', note: 'Needed when enabling database persistence.' },
  { key: 'POSTGRES_URL_NON_POOLING', required: 'optional', where: 'Prisma migrations/runtime', note: 'Companion URL for Prisma on Vercel.' },
]

const apiRows = [
  { route: 'GET /api/blobs/:blobId/status', purpose: 'Fetch current blob health and renewal need.' },
  { route: 'POST /api/pay/renew/:blobId', purpose: 'Paid renewal path (x402 flow).' },
  { route: 'POST /api/demo/renew/:blobId', purpose: 'Demo renewal path for presentations.' },
  { route: 'POST /api/demo/autopilot', purpose: 'Enable autopilot in demo mode.' },
  { route: 'GET /api/events', purpose: 'SSE event stream used by Agent Vault TX feed.' },
]

const installSteps = [
  {
    id: '01',
    title: 'Clone and enter app directory',
    body: 'Work from the monorepo root, then move into the Next.js app folder.',
    cmd: `git clone https://github.com/nirmalplays/BlobMaster.git
cd BlobMaster/blobmaster-app`,
  },
  {
    id: '02',
    title: 'Install dependencies',
    body: 'Install app dependencies and linked workspace packages.',
    cmd: `npm install`,
  },
  {
    id: '03',
    title: 'Configure environment variables',
    body: 'Create your env from template and fill values before running chain actions.',
    cmd: `cp .env.example .env.local`,
  },
  {
    id: '04',
    title: 'Run development server',
    body: 'Start local app and open dashboard/economy routes.',
    cmd: `npm run dev`,
  },
]

export default function DevDocsPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 md:px-10 py-10 lg:px-12 lg:py-14 text-zinc-400 leading-relaxed">
      <header className="mb-14 pb-10 border-b border-zinc-800/80">
        <p className="text-sm text-zinc-500 mb-3 font-medium">Developer guide</p>
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-50 font-serif tracking-tight">
          BlobMaster Dev Docs
        </h1>
        <p className="mt-5 text-lg text-zinc-400 max-w-2xl">
          How to wire <span className="text-emerald-400 font-medium">blobmaster-sdk</span> into your own backend or script,
          plus app setup, env, deploy, and operations.
        </p>
      </header>

      <section id="getting-started" className="scroll-mt-28 py-10">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">
          Getting started
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {installSteps.map((s) => (
            <article key={s.id} className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-5">
              <div className="text-emerald-400/90 text-xs font-mono mb-2">Step {s.id}</div>
              <h3 className="font-semibold text-zinc-100 mb-2">{s.title}</h3>
              <p className="text-zinc-500 text-sm mb-3">{s.body}</p>
              <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-300 overflow-x-auto font-mono">{s.cmd}</pre>
            </article>
          ))}
        </div>
        <p className="text-zinc-500 text-sm mt-6">
          Default local URL: <span className="text-emerald-400 font-mono text-xs">http://localhost:3000</span>
        </p>
      </section>

      <section id="using-sdk" className="scroll-mt-28 py-10 border-t border-zinc-800/80">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">
          Using blobmaster-sdk in a real project
        </h2>
        <p className="text-zinc-400 text-sm max-w-3xl mb-8">
          The SDK is a small Node-capable client: <span className="text-zinc-200">chain reads</span> (blob status),{' '}
          <span className="text-zinc-200">x402-paid renewals and autopilot</span> against the hosted BlobMaster API,{' '}
          <span className="text-zinc-200">Synapse/Sui store and retrieve</span> (needs a private key), and{' '}
          <span className="text-zinc-200">AgentVault</span> for demo-style autonomous agents.
          Treat it like any server-side SDK: <span className="text-emerald-400 font-medium">never ship private keys to the browser.</span>
        </p>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Install</h3>
        <div className="space-y-3 text-zinc-300 text-sm mb-8">
          <p>
            <span className="text-zinc-500">From npm</span> (when published or in your registry):
          </p>
          <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 overflow-x-auto font-mono text-sm text-zinc-300">{`npm install blobmaster-sdk viem`}</pre>
          <p className="text-zinc-500">
            <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-300 font-mono text-xs">viem</code> is a peer dependency used by the x402 payment path; keep it aligned with your app&apos;s version (≥ 2).
          </p>
          <p>
            <span className="text-zinc-500">Inside this monorepo</span>, depend on the local package and build it once:
          </p>
          <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 overflow-x-auto font-mono text-sm text-zinc-300">{`# in blobmaster-app/package.json
"blobmaster-sdk": "file:../blobmaster-sdk"

cd ../blobmaster-sdk && npm install && npm run build
cd ../blobmaster-app && npm install`}</pre>
        </div>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Import surface</h3>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`import {
  BlobMaster,
  AgentVault,
  NETWORKS,
  getNetworkConfig,
  // errors: BlobNotFoundError, BlobMasterError, …
  // helpers: epochsToHuman, attoFilToFil, …
} from 'blobmaster-sdk'`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Configure BlobMaster</h3>
        <p className="text-zinc-400 text-sm mb-3">
          The constructor <span className="text-zinc-200">requires</span> either <code className="text-emerald-400/90 font-mono text-xs">privateKey</code> or{' '}
          <code className="text-emerald-400/90 font-mono text-xs">x402Wallet</code> (e.g. a viem <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">WalletClient</code>), because paid routes use x402 even when you only call free helpers afterward.
        </p>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-4 font-mono">{`import { BlobMaster } from 'blobmaster-sdk'

const sk = new BlobMaster({
  privateKey: process.env.FILECOIN_WALLET_PRIVATE_KEY as \`0x\${string}\`,
  network: 'calibration', // or 'mainnet'
  // Optional overrides:
  suiRpc: process.env.FILECOIN_RPC_URL,
  blobmasterApiUrl: process.env.STORKEEP_API_URL, // defaults: calibration → https://api.calibration.blobmaster.xyz
})`}</pre>
        <p className="text-zinc-500 text-sm mb-8">
          Default API and RPC URLs match{' '}
          <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">getNetworkConfig(&apos;calibration&apos;)</code> /{' '}
          <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">NETWORKS.calibration</code> in the SDK source.
        </p>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Blob status (free RPC)</h3>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`const status = await sk.getBlobStatus('5847291')
// status.needsRenewal, status.epochsUntilExpiry, status.status: 'active' | 'expiring' | 'expired'`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Renew a blob (x402 USDC)</h3>
        <p className="text-zinc-400 text-sm mb-3">
          Calls <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">POST {`\${blobmasterApiUrl}/api/blobs/:blobId/renew`}</code> with automatic payment headers from x402.
        </p>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`const out = await sk.renewBlob(blobId, {
  durationEpochs: undefined, // SDK default: MIN_DEAL_DURATION
  maxPriceUsdc: 1.0,         // abort if response cost exceeds this
})
// out.txHash, out.basescanUrl, out.suivisionUrl, out.actualCostUsdc, …`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Autopilot</h3>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`await sk.enableAutopilot({
  blobId,
  renewWhenEpochsLeft: 100_000,
  maxPriceUsdc: 1.0,
  webhookUrl: 'https://your.app/hooks/blobmaster', // optional
  webhookSecret: '…', // optional
})
const ap = await sk.getAutopilotStatus(blobId)
await sk.disableAutopilot(blobId)`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Balance helper</h3>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`const { usdc, address, network } = await sk.getBalance()`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Storage (Synapse / Sui)</h3>
        <p className="text-zinc-400 text-sm mb-3">
          Requires <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">privateKey</code> in the constructor (not x402-only wallet shorthand without private key).
        </p>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`const { cid, bytes } = await sk.store(Buffer.from('hello'), { redundancy: 2, ttl: '30d' })
const buf = await sk.retrieve(cid)
await sk.prune(cid)`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Errors</h3>
        <p className="text-zinc-400 text-sm mb-3">
          Import typed errors from the same package and branch on them in your service layer.
        </p>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`import {
  BlobMasterError,
  BlobNotFoundError,
  BlobExpiredError,
  RenewalFailedError,
  X402PaymentError,
} from 'blobmaster-sdk'`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">AgentVault (agents + optional UI events)</h3>
        <p className="text-zinc-400 text-sm mb-3">
          Use <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">AgentVault</code> when you want producer/consumer/guardian-style agents with budgets, Synapse storage, and listing discovery.
          Events POST to your app base URL from <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">NEXT_PUBLIC_APP_URL</code> / <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">APP_URL</code> (same pattern as this repo&apos;s{' '}
          <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">/api/events/emit</code> bridge).
        </p>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-x-auto mb-8 font-mono">{`import { AgentVault, DEFAULT_POLICIES } from 'blobmaster-sdk'

const agent = new AgentVault({
  agentType: 'producer',
  network: 'calibration',
  privateKey: process.env.FILECOIN_WALLET_PRIVATE_KEY as \`0x\${string}\`,
  budget: '10',
  rpcUrl: process.env.FILECOIN_RPC_URL,
  policies: { ...DEFAULT_POLICIES, maxStoredBytes: 1_000_000 },
})
await agent.store({ demo: true })`}</pre>

        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-10">Next.js and security</h3>
        <ul className="list-disc list-inside text-zinc-400 text-sm space-y-2 mb-4 marker:text-zinc-600">
          <li>Instantiate <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">BlobMaster</code> only in <span className="text-zinc-200">API routes, Route Handlers, or server actions</span>—never in client components.</li>
          <li>Pass <code className="rounded bg-zinc-900 px-1 font-mono text-xs text-zinc-300">blobId</code> and options from authenticated requests; do not trust raw client input for spend limits.</li>
          <li>For paid flows, ensure the wallet used by the SDK has enough USDC on the x402 network (e.g. Base Sepolia for calibration).</li>
        </ul>
      </section>

      <section id="environment-variables" className="scroll-mt-28 py-10 border-t border-zinc-800/80">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">Environment variables</h2>
        <div className="overflow-x-auto border border-zinc-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80">
              <tr className="text-left text-zinc-400">
                <th className="p-3 font-medium">Variable</th>
                <th className="p-3 font-medium">Required</th>
                <th className="p-3 font-medium">Used In</th>
                <th className="p-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {envRows.map((row) => (
                <tr key={row.key} className="border-t border-zinc-800 text-zinc-400">
                  <td className="p-3 text-emerald-400/90 font-mono text-xs">{row.key}</td>
                  <td className="p-3">{row.required}</td>
                  <td className="p-3">{row.where}</td>
                  <td className="p-3">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="demo-runbook" className="scroll-mt-28 py-10 border-t border-zinc-800/80">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">Demo runbook</h2>
        <ol className="list-decimal list-inside space-y-3 text-zinc-400 marker:text-zinc-600">
          <li>Open <span className="text-emerald-400 font-mono text-sm">/dashboard</span>.</li>
          <li>Check a blob ID, then run one renewal (demo or paid path).</li>
          <li>Enable autopilot once to confirm the flow and counter updates.</li>
          <li>Open <span className="text-emerald-400 font-mono text-sm">/economy</span> and click Start (2 min) for Agent Vault live feed.</li>
          <li>Return to home page to confirm counters are updated.</li>
        </ol>
      </section>

      <section id="build-deploy" className="scroll-mt-28 py-10 border-t border-zinc-800/80">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">Build and deploy</h2>
        <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 text-sm text-zinc-300 overflow-x-auto font-mono">{`# local production check
npm run build

# deploy using connected Vercel project
vercel --prod`}</pre>
        <p className="text-zinc-400 text-sm mt-4">
          Vercel project settings: Root Directory must be <span className="text-emerald-400 font-mono text-xs">blobmaster-app</span>.
        </p>
      </section>

      <section id="api-routes" className="scroll-mt-28 py-10 border-t border-zinc-800/80 pb-8">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">Core API routes</h2>
        <div className="border border-zinc-800 rounded-xl divide-y divide-zinc-800 overflow-hidden">
          {apiRows.map((row) => (
            <div key={row.route} className="p-4 bg-zinc-900/20">
              <div className="text-emerald-400/90 font-mono text-sm">{row.route}</div>
              <div className="text-zinc-500 text-sm mt-1">{row.purpose}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-28 py-10 border-t border-zinc-800/80">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">FAQ</h2>
        <div className="space-y-4">
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">SDK vs this Next.js app</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              <span className="text-zinc-200">blobmaster-sdk</span> is the library you import in your own backend, workers, or scripts
              (blob status, renewals, autopilot, optional Synapse storage, AgentVault).{' '}
              <span className="text-zinc-200">blobmaster-app</span> is the reference UI and API routes that wire those flows to a dashboard and demo;
              for production integrations you typically call the SDK from your services or call the same BlobMaster HTTP API the SDK uses.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">What is BlobMaster?</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              BlobMaster is a Sui-focused automation app that monitors blobs and renews them before expiry,
              with optional autopilot and a live Agent Vault demo for autonomous storage-economy behavior.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">What problem does it solve?</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Sui blobs can expire and data availability can degrade if renewals are missed. BlobMaster reduces
              manual operations by automating health checks, renewal triggers, and tracking renewal outcomes.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">Who is it built for?</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Teams and builders storing important data on Sui: app developers, protocol teams, infra operators,
              and hackathon builders who need a visible, automated renewal workflow.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">Is it open source?</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Yes. BlobMaster is hosted publicly on GitHub in this repository and can be cloned, modified,
              and redeployed for your own workflows.
            </p>
          </div>
        </div>
      </section>

      <section id="troubleshooting" className="scroll-mt-28 py-10 border-t border-zinc-800/80 pb-24">
        <h2 className="text-2xl font-semibold text-zinc-50 font-serif mb-6">Troubleshooting</h2>
        <div className="space-y-4">
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">Build error: Cannot resolve blobmaster-sdk</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Ensure app root is <span className="text-emerald-400 font-mono text-xs">blobmaster-app</span> in Vercel and latest commit is deployed.
              This repo is patched to avoid guardian runtime dependency issues.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">Runtime error: invalid private key</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              `FILECOIN_WALLET_PRIVATE_KEY` must be exactly <span className="text-emerald-400 font-mono text-xs">0x + 64 hex chars</span>, no quotes/newlines.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">Counters reset unexpectedly</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Dashboard and home counters use browser localStorage keys:
              <span className="text-emerald-400 font-mono text-xs"> blobmaster_blobsRenewed </span> and
              <span className="text-emerald-400 font-mono text-xs"> blobmaster_autopilotCount</span>.
            </p>
          </div>
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <div className="text-emerald-400/90 font-medium mb-2 text-sm">Do I need Connect Wallet?</div>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Current flow is server-wallet driven for renewals/autopilot; user wallet connect is intentionally removed from dashboard.
            </p>
          </div>
        </div>
      </section>
    </article>
  )
}
