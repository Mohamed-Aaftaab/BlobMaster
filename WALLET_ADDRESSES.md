# Wallet / Contract Address Inventory

Generated from repository-wide search for `0x[a-fA-F0-9]{40}`.

## User / Example Wallet Addresses

These look like externally-owned (user-style) addresses or simple examples.

| Address | Seen In | Notes |
|---|---|---|
| `0x4e51EA274b9a6192B2BBB7734b6bE50bC7B4752B` | `blobmaster-app/app/economy/page.tsx` | Example wallet used in the Economy demo page. |
| `0x1d68253889deFde41175A670e4A3F13C84918EDf` | `.claude/settings.json` | Address used in example curl commands. |

## Contracts / System Addresses

These are contracts or system-level addresses used by BlobMaster and dependencies.

| Address | Seen In | Role |
|---|---|---|
| `0x0000000000000000000000000000000000000000` | `blobmaster-app/lib/blobmaster-registry.ts`, `blobmaster-app/lib/renew.ts`, `blobmaster-api/src/lib/registry.ts` | Null / sentinel address used as a default or "unset" value. |
| `0x7CC100a2c115e5B02F7BbaC7616D290A17D89397` | `blobmaster-app/app/dashboard/page.tsx` | Registry contract address used by the dashboard UI. |
| `0x950573A17492C4fbD9899B494BE65FD6d99Fb052` | `blobmaster-sdk/src/config/networks.ts` | BlobMaster registry contract (from SDK network config). |
| `0x4015c3E5453d38Df71539C0F7440603C69784d7a` | `blobmaster-app/app/api/logs/route.ts`, `next-arch.mdx`, `blobmaster-prd.mdx`, `blobmaster-sdk/src/config/networks.ts`, `blobmaster-app/.env.example`, `blobmaster-api/src/lib/lighthouse.ts`, `blobmaster-app/lib/lighthouse.ts` | Lighthouse RaaS contract on Calibration testnet. |
| `0xd928b92E6028463910b2005d118C2edE16C38a2a` | `blobmaster-prd.mdx`, `blobmaster-sdk/src/config/networks.ts` | Lighthouse RaaS contract on mainnet. |

## Token Addresses

These are ERC-20 USDC token contract addresses.

| Address | Seen In | Network |
|---|---|---|
| `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | `.claude/settings.json`, `blobmaster-prd.mdx`, `blobmaster-sdk/src/config/networks.ts` | USDC on Base Sepolia. |
| `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `blobmaster-prd.mdx`, `blobmaster-sdk/src/config/networks.ts` | USDC on Base mainnet. |

## Notes

- This list includes both demo/example EOA addresses and contract/token addresses.
- Dynamic runtime wallet addresses (e.g., from connected browser wallets) are not hardcoded and therefore do not appear as fixed literals here.
