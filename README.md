# BlobMaster 🛸

> Non-custodial Sui Walrus blob lifecycle manager — your blobs are renewed automatically **as long as your on-chain vault has SUI**.

[![Move Contract](https://img.shields.io/badge/Move-vault.move-blue?style=flat-square)](./contracts/blobmaster/sources/vault.move)
[![Tests](https://img.shields.io/badge/tests-27%20passing-brightgreen?style=flat-square)](./blobmaster-sdk/src/__tests__/BlobMaster.test.ts)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![Tatum](https://img.shields.io/badge/RPC-Tatum-purple?style=flat-square)](https://tatum.io)

> 🚀 **Live Demo:** [https://blobmaster-app.vercel.app](https://blobmaster-app.vercel.app)

---

## What is BlobMaster?

Sui Walrus blobs expire after a fixed number of epochs. When a blob's storage epochs run out, your data is no longer guaranteed to remain available on the decentralized network. BlobMaster is the missing infrastructure layer — it monitors your Walrus blobs and **triggers on-chain renewals** before your data disappears.

**No custody. No private keys on a server. No single point of failure.** BlobMaster uses a Sui Move smart contract so you own your vault — the protocol cannot touch your funds.

> **Testnet status:** The `execute_renewal` Move function records the renewal on-chain and pays the keeper reward. Native Walrus `extend_blob` integration (via WAL coin) will be available once the Walrus Move SDK exposes the extension entrypoint publicly. The keeper also calls the Walrus aggregator REST API to read live blob expiry.

---

## Architecture

```
BlobMaster/
├── contracts/blobmaster/        # Sui Move smart contract (THE core)
│   └── sources/vault.move       # Vault, AutopilotRule, execute_renewal
├── blobmaster-sdk/              # TypeScript SDK — builds Sui PTBs, zero HTTP wrapping
│   └── src/BlobMaster.ts        # createVaultTx, depositTx, withdrawTx, registerAutopilotTx,
│                                #  deleteRuleTx, executeRenewalTx, uploadBlob, getBlobInfo
├── blobmaster-app/              # Next.js UI — wallet connect via @mysten/dapp-kit
│   ├── app/dashboard/           # Sui wallet-connected blob manager
│   └── app/api/keeper/          # Keeper endpoint (Vercel cron or external)
└── keeper/                      # Standalone Node.js keeper daemon (no Vercel dependency)
    └── keeper.ts
```

**Stack:**
- **Smart Contract:** Sui Move (non-custodial `Vault` + `AutopilotRule` objects)
- **Frontend:** Next.js 14, `@mysten/dapp-kit`, `@tanstack/react-query`
- **RPC:** [Tatum Sui nodes](https://tatum.io) (`https://sui-testnet.gateway.tatum.io`)
- **SDK:** `@mysten/sui.js` — constructs Programmable Transaction Blocks directly
- **Storage:** [Walrus](https://walrus.xyz) decentralized storage (aggregator + publisher)
- **Keeper:** Any Node.js process — reads on-chain events, executes `execute_renewal`
- **No database** — all rule state lives on-chain as Sui objects

---

## How It Works

1. **User creates a Vault** — a Sui Move object owned entirely by the user's wallet address
2. **User deposits SUI** — directly into their on-chain Vault. No one else can withdraw
3. **User uploads to Walrus** — via the SDK's `uploadBlob()` or the Walrus CLI, gets a blob ID
4. **User registers an AutopilotRule** — specifying the blob ID, renewal threshold, keeper reward
5. **Keeper nodes** monitor Sui for `RuleCreated` events, check blob expiry via the Walrus aggregator, and call `execute_renewal()` to earn the keeper reward. Anyone can run a keeper
6. **All renewal history** is verifiable on-chain via `BlobRenewed` events

---

## Smart Contract — Deployed

```
PackageID: 0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e
Network:   Sui Testnet (v1.73.1)
Tx Digest: DukZ844TdGBiG5GzGrhD5jruMDrnQRjjMqvYXPqxbTG3
Explorer:  https://testnet.suivision.xyz/package/0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e
```

Key functions:
- `create_vault(ctx)` — creates a user-owned Vault
- `deposit(vault, payment, ctx)` — deposits SUI into a Vault
- `withdraw(vault, amount, ctx)` — owner-only withdrawal
- `register_autopilot(vault, blob_id, ...)` — creates a shared AutopilotRule; asserts caller is vault owner
- `delete_rule(rule, vault, ctx)` — owner-only rule cancellation
- `execute_renewal(rule, vault, storage_cost, ctx)` — called by any keeper; pays keeper reward from vault

---

## SDK Usage

```bash
npm install @mysten/sui.js
# (blobmaster-sdk is in /blobmaster-sdk — local package)
```

```typescript
import { BlobMaster } from 'blobmaster-sdk'

// Powered by Tatum RPC — get your free API key at dashboard.tatum.io
const bm = new BlobMaster({
  network:     'testnet',
  tatumApiKey: process.env.TATUM_API_KEY,
})

// 1. Upload a file to Walrus
const blobId = await bm.uploadBlob(fileBytes, 30) // 30 epochs = ~30 days

// 2. Create your personal on-chain Vault
const createTx = bm.createVaultTx()
await signAndExecuteTransaction({ transaction: createTx })

// 3. Deposit SUI into your vault (e.g. 5 SUI = 5_000_000_000 MIST)
const depositTx = bm.depositTx('<vault-object-id>', BigInt(5_000_000_000))
await signAndExecuteTransaction({ transaction: depositTx })

// 4. Register autopilot for your blob
const autopilotTx = bm.registerAutopilotTx('<vault-id>', {
  blobId:               blobId,
  renewWhenEpochsLeft:  10,        // renew when 10 days left
  epochsToAdd:          30,        // add 30 days
  maxPricePerEpoch:     1_000_000, // max 0.001 SUI per epoch
  keeperReward:         500_000,   // reward keeper 0.0005 SUI
  webhookUrl:           'https://your-app.com/webhook',
})
await signAndExecuteTransaction({ transaction: autopilotTx })

// 5. Check blob status
const info = await bm.getBlobInfo(blobId)
console.log(`${info.epochsUntilExpiry} days until expiry, status: ${info.status}`)

// 6. Query your vaults
const vaults = await bm.getVaults('0xYOUR_ADDRESS')

// 7. Withdraw from vault
const withdrawTx = bm.withdrawSuiTx('<vault-id>', 1.0) // 1 SUI
await signAndExecuteTransaction({ transaction: withdrawTx })
```

All transactions are signed **client-side by your wallet**. BlobMaster never sees your private key.

---

## Getting Started

### Prerequisites
- Node.js >= 20
- A [Tatum API key](https://dashboard.tatum.io) (free)
- A Sui Testnet wallet with SUI from the [faucet](https://faucet.sui.io)

### Installation

```bash
git clone https://github.com/Mohamed-Aaftaab/BlobMaster.git
cd BlobMaster/blobmaster-app
cp .env.example .env.local
# Edit .env.local and add your TATUM_API_KEY
npm install
npm run dev
```

Open:
- **Main App:** [http://localhost:3000](http://localhost:3000)
- **Dashboard:** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### Running the Keeper

```bash
cd BlobMaster/keeper
export TATUM_API_KEY=your_tatum_api_key
export KEEPER_PRIVATE_KEY=suiprivkey...
export BLOBMASTER_PACKAGE_ID=0xf2c231a4ac2f95b6f88354a1a69b0e9e367bc728064b5ba14b5f8436b20f4a7e
npx ts-node keeper.ts
```

The keeper is permissionless — anyone can run one and earn keeper rewards from user vaults.

---

## Security

- **Vaults are owned objects** — only the owner address can `withdraw` or `register_autopilot`
- **Keepers cannot steal funds** — `execute_renewal` validates `object::id(vault) == rule.vault_id` and only disperses the pre-agreed storage cost + keeper reward
- **No server private keys** — the frontend uses `@mysten/dapp-kit` to sign in the user's wallet
- **Keeper reward is bounded** — set by the user when registering the rule; cannot be changed by the keeper

---

## Powered By

- [Tatum](https://tatum.io) — Enterprise Sui RPC nodes (`https://sui-testnet.gateway.tatum.io`)
- [Walrus](https://walrus.xyz) — Decentralized storage on Sui
- [Sui Move](https://docs.sui.io) — Smart contract platform

---

## License

MIT — see [LICENSE](./LICENSE)
