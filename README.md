# 🐙 BlobMaster

**BlobMaster is a decentralized, non-custodial storage autopilot for the Sui Walrus network.**

It allows anyone to deposit SUI into an on-chain Vault and register Autopilot Rules for their Walrus blobs. "Keepers" (background daemons) constantly monitor your blob's expiration date. When a blob is about to expire, a Keeper triggers an on-chain `execute_renewal` function, automatically paying the Walrus publisher network to extend the blob's storage life and earning a small reward from your Vault.

---

## 🚀 The V3 Architecture: 100% Trustless

BlobMaster has evolved to its **V3 Architecture** for the Tatum x Walrus Hackathon, boasting a mathematically secure, decentralized foundation.

### 1. On-Chain `PriceOracle`
Keepers **cannot** cheat the system. The BlobMaster Move contract features a `PriceOracle` that stores the live `mist_per_epoch_per_megabyte` rate. When a Keeper executes a renewal, the contract calculates the exact storage cost dynamically based on the blob's size and the market rate.

### 2. User-Declared Blob Sizes
Instead of trusting the Keeper to report the size of the blob being renewed, **users declare the `blob_size_bytes`** when they register an Autopilot Rule. Because it is the user's own funds on the line, they have zero incentive to inflate the size, effectively locking the Keeper out of the cost equation entirely!

### 3. Prisma + SQLite Telemetry
The AI Diagnostics dashboard and Agent Economy simulation are now backed by a robust Prisma ORM and local SQLite database (`dev.db`), completely eliminating fragile filesystem logs and memory leaks.

---

## 🛠️ Tech Stack
* **Smart Contracts**: Move on Sui Testnet (v1.73.1)
* **Frontend**: Next.js 14, Tailwind CSS, Framer Motion
* **Database**: Prisma ORM with local SQLite
* **SDK**: TypeScript, `@mysten/sui.js`, Tatum RPC endpoints
* **Keepers**: Standalone Node.js daemon
* **AI Engine**: Google Gemini (Flash 1.5) for multi-agent market simulations

---

## 📦 Running the Project Locally

### 1. Setup the Database
```bash
cd blobmaster-app
npm install
npx prisma db push
```

### 2. Run the Next.js Dashboard
```bash
npm run dev
```
Open `http://localhost:3000` to view the beautiful BlobMaster dashboard, fund a Vault, and watch the AI Agents simulate a thriving Walrus storage economy.

### 3. Run the Keeper Daemon
```bash
cd keeper
npm install
# Set your KEEPER_PRIVATE_KEY inside .env
npx tsx keeper.ts
```
The Keeper will begin listening to the Sui Testnet for `RuleCreated` events and extending Walrus blobs when they are about to expire!

---

*Submitted for the Tatum x Walrus Hackathon.*
