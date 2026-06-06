# BlobMaster 🛸

> Autonomous Sui Walrus blob manager — your data never expires again.

[![npm](https://img.shields.io/badge/npm-blobmaster--sdk-red?style=flat-square)](https://www.npmjs.com/package/blobmaster-sdk)

> 🚀 **Live Demo:** [https://blobmaster-app.vercel.app](https://blobmaster-app.vercel.app)

---

## What is BlobMaster?

Sui Walrus blobs require regular epoch renewals to persist. When a blob's storage epochs expire, your data is no longer guaranteed to remain available on the decentralized network. BlobMaster is the missing infrastructure layer — it monitors your Walrus blobs, prices extensions in real time, and executes them on-chain automatically before your data disappears.

No alerts. No dashboards. No manual steps. Your data stays alive.

---

## Features

- **Live Blob Dashboard** — Query any Walrus blob ID and get instant status: current epoch, expiry countdown, and extension cost in USDC.
- **One-Click Extension** — Submits a real on-chain SUI transaction to extend the blob's life directly on Walrus.
- **Auto-Renew Mode** — Monitors blobs continuously and extends them automatically when the expiry threshold is crossed.
- **Autopilot** — Register a blob once, and BlobMaster watches it forever.
- **Agent Economy** — Autonomous producer, consumer, and guardian agents demonstrating a self-sustaining decentralized storage marketplace built on SUI.
- **x402 Payments** — Live USDC payment flow via x402-next.
- **Vault Server Wallet** — Dedicated SUI wallet for gas and epoch payments, completely abstracted from the end-user.

---

## Live Demo

Try it out on the Live Dashboard:
1. Open the [Live Vercel Deployment](https://blobmaster-app.vercel.app/dashboard)
2. Enter a valid Walrus Blob ID (e.g. `_xH_wK4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4`).
3. Click **Check Status**.
4. Click **Extend Blob**.
5. Watch the SUI Vision transaction link appear and the vault balance drop in real time.

---

## Architecture

```
BlobMaster/
├── blobmaster-app/          # Next.js frontend + API routes
│   ├── app/
│   │   ├── dashboard/       # Main blob manager UI
│   │   ├── api/
│   │   │   ├── blobs/       # Blob status queries & extension
│   │   │   ├── demo/        # Demo renewal + autopilot
│   │   │   ├── pay/         # x402 USDC payment renewal
│   │   │   ├── economy/     # Agent economy start/stop
│   │   │   └── events/      # SSE event stream
│   │   ├── economy/         # Agent Economy UI Graph
│   ├── agents/              # Guardian, Producer + Consumer agent logic
│   └── lib/                 # Wallet, event bus, SUI helpers
└── blobmaster-sdk/          # Published npm package (AgentVault, BlobMaster SDK)
```

**Stack:**
- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain:** SUI Testnet / Walrus Testnet
- **Payments:** x402-next, USDC
- **Storage:** Walrus
- **Database:** Prisma (PostgreSQL / Edge)
- **Deployment:** Vercel

---

## Getting Started (Local Development)

### Prerequisites

- Node.js >= 20
- npm or yarn
- A SUI Testnet wallet with testnet SUI (from the SUI Faucet)
- Vercel Postgres or local PostgreSQL database

### Installation

```bash
git clone https://github.com/Mohamed-Aaftaab/BlobMaster.git
cd BlobMaster/blobmaster-app

# Set up environment variables
cp .env.example .env.local

# Install dependencies
npm install

# Generate Postgres client
npx prisma generate

# Run the app locally
npm run dev
```

If you are running the app locally on your machine, you can open:
- **Main App:** [http://localhost:3000](http://localhost:3000)
- **Pitch Deck:** [http://localhost:3000/pitch](http://localhost:3000/pitch) 
- **Agent Economy Visualizer:** [http://localhost:3000/economy](http://localhost:3000/economy)

## Deploy

Configure environment variables (see `.env.example`) on Vercel and deploy the `blobmaster-app` directory as the project root. The app utilizes Vercel Serverless Postgres and standard Node.js Next.js API routes.
