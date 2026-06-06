# BlobMaster App

This is the Next.js frontend and API backend for the **BlobMaster** SUI Walrus blob manager and the **Agent Vault** live economy demo (located at [`/economy`](./app/economy/page.tsx)). 

## Related Packages (Same Repository)

- **`../blobmaster-sdk`** — npm package: Contains the core `AgentVault`, SUI Walrus bindings, and the x402 payment integration.

## Run Locally

```bash
cd blobmaster-app
cp .env.example .env.local   # Configure your Wallet and Database URIs
npm install
npx prisma generate          # Build the Postgres client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
- **Pitch Deck:** [http://localhost:3000/pitch](http://localhost:3000/pitch) — Snap-scroll presentation deck.
- **Agent Vault Economy:** [http://localhost:3000/economy](http://localhost:3000/economy) — Live visualization of SUI agents trading and renewing blobs.

## Deploy

Configure the environment variables (see `.env.example`) on Vercel and deploy this directory as the application root. The app seamlessly supports Vercel Serverless Postgres and standard Node.js Next.js API routes.
