# BlobMaster 🗄️

> Autonomous Filecoin deal manager — your data never expires again.

[![Live App](https://img.shields.io/badge/Live%20App-stor--keep.vercel.app-00ff88?style=flat-square)](https://stor-keep.vercel.app)
[![npm](https://img.shields.io/badge/npm-blobmaster--sdk-red?style=flat-square)](https://www.npmjs.com/package/blobmaster-sdk)
[![Hackathon](https://img.shields.io/badge/PL%20Genesis-Hackathon-purple?style=flat-square)](https://pl-genesis-frontiers-of-collaboration-hackathon.devspot.app)

---

## What is BlobMaster?

Filecoin storage deals have fixed expiry epochs. When a deal expires, your data is no longer guaranteed to persist on the network. BlobMaster is the missing infrastructure layer — it monitors your Filecoin deals, prices renewals in real time, and executes them on-chain automatically through Lighthouse RaaS before your data disappears.

No alerts. No dashboards. No manual steps. Your data stays alive.

---

## Features

- **Live Deal Dashboard** — Query any Filecoin deal ID and get instant status: provider miner, expiry countdown, renewal cost in USDC
- **One-Click Renewal** — Submits a real on-chain transaction via the Lighthouse RaaS contract
- **Auto-Renew Mode** — Monitors deals continuously and renews automatically when the expiry threshold is crossed
- **Autopilot** — Register a deal once, BlobMaster watches it forever
- **On-Chain Registry** — Every renewal is recorded in the BlobMaster Registry smart contract on Filecoin Calibration
- **Agent Economy** — Autonomous producer and consumer agents demonstrating a self-sustaining decentralized storage marketplace
- **x402 Payments** — Live USDC payment flow on Base Sepolia via x402-next
- **Vault Wallet** — Dedicated Filecoin wallet for gas payments, separate from connected MetaMask

---

## Live Demo

🌐 **[stor-keep.vercel.app](https://stor-keep.vercel.app)**

Try it:
1. Toggle **Demo Mode** ON
2. Enter deal ID `217302`
3. Click **Check**
4. Click **Renew Now (demo)**
5. Watch the Filfox transaction link appear and the vault balance drop in real time

---

## Architecture

```
blobmaster-main/
├── blobmaster-app/          # Next.js frontend + API routes
│   ├── app/
│   │   ├── dashboard/     # Main deal manager UI
│   │   └── api/
│   │       ├── deals/     # Deal status queries
│   │       ├── demo/      # Demo renewal + autopilot
│   │       ├── pay/       # x402 USDC payment renewal
│   │       ├── economy/   # Agent economy start/stop
│   │       └── events/    # SSE event stream
│   ├── agents/            # Producer + consumer agent logic
│   └── lib/               # Wallet, event bus, agent state
├── blobmaster-sdk/          # Published npm package
├── blobmaster-contracts/    # Solidity smart contracts
└── blobmaster-api/          # Standalone API server
```

**Stack:**
- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain:** Filecoin Calibration Testnet, Base Sepolia
- **Contracts:** Solidity (Hardhat)
- **Payments:** x402-next, USDC on Base Sepolia
- **Storage Renewal:** Lighthouse RaaS
- **Database:** Neon PostgreSQL (Prisma)
- **Deployment:** Vercel

---

## Smart Contracts

| Contract | Network | Address |
|---|---|---|
| BlobMaster Registry | Filecoin Calibration | `0x7CC100a2c115e5B02F7BbaC7616D290A17D89397` |
| Lighthouse RaaS | Filecoin Calibration | `0x4015c3E5453d38Df71539C0F7440603C69784d7a` |

[View Registry on Filfox ↗](https://calibration.filfox.info/en/address/0x7CC100a2c115e5B02F7BbaC7616D290A17D89397)

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm or yarn
- A Filecoin Calibration wallet with tFIL ([get from faucet](https://faucet.calibration.fildev.network/))
- Neon PostgreSQL database

### Installation

```bash
git clone https://github.com/Mohamed-Aaftaab/BlobMaster.git
cd BlobMaster/blobmaster-app
npm install
```

### Environment Variables

Create a `.env.local` file in `blobmaster-app/`:

```env
# Required
FILECOIN_WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
FILECOIN_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
LIGHTHOUSE_RAAS_CONTRACT=0x4015c3E5453d38Df71539C0F7440603C69784d7a
BLOBMASTER_REGISTRY_CONTRACT=0x7CC100a2c115e5B02F7BbaC7616D290A17D89397
BLOBMASTER_WALLET_ADDRESS=0xYOUR_WALLET_ADDRESS
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Optional
CRON_SECRET=your_random_secret
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## SDK

BlobMaster's core logic is published as a standalone npm package:

```bash
npm install blobmaster-sdk
```

```typescript
import { BlobMaster } from 'blobmaster-sdk'

const sk = new BlobMaster({
  privateKey: process.env.FILECOIN_WALLET_PRIVATE_KEY,
  network: 'calibration',
})

// Check deal status
const status = await sk.getDealStatus('217302')
console.log(status.daysUntilExpiry, status.renewalCostUsdc)

// Renew a deal
const result = await sk.renewDeal('217302')
console.log(result.filfoxUrl)
```

[View on npm ↗](https://www.npmjs.com/package/blobmaster-sdk)

---

## Agent Economy

BlobMaster includes a demonstration of an autonomous storage marketplace:

**Producer agents** store data on Filecoin, post listings with a price per retrieval, and earn USDFC when consumers retrieve their data.

**Consumer agents** discover listings, pay for retrievals autonomously, and their budgets deplete in real time. When a consumer runs out of funds, it dies.

**BlobMaster is the foundation:** every producer agent's data is backed by a Filecoin deal. BlobMaster renews those deals automatically — without it, the entire agent economy collapses the moment a deal expires.

To start the agent economy demo:
1. Go to the dashboard
2. Click **Start Economy**
3. Watch producers store, consumers pay, and budgets flow in real time

---

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
cd BlobMaster  # root of the repo
vercel --prod
```

Set all environment variables in **Vercel → Settings → Environment Variables** before deploying.

---

## Hackathon

Built for **[PL Genesis: Frontiers of Collaboration Hackathon](https://pl-genesis-frontiers-of-collaboration-hackathon.devspot.app)**

- **Track:** Fresh Code
- **Bounties:** Filecoin · Lighthouse
- **Builder:** Nirmal

---

## License

MIT © Nirmal
