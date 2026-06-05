import { BlobMaster, epochsToHuman, DealExpiredError, PriceExceededError } from './blobmaster-sdk/src/index'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const DEAL_ID = process.env.DEAL_ID ?? '5847291'

const account = privateKeyToAccount(`0x${process.env.DEMO_KEY}` as `0x${string}`)
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() })
const sk = new BlobMaster({ x402Wallet: wallet, network: 'calibration' })

async function main() {
  // ── Step 1: Check deal health ──────────────────────────────────────────────
  console.log('\n── Checking deal status...')
  const status = await sk.getDealStatus(DEAL_ID)

  console.log(`Deal ${DEAL_ID}:`)
  console.log(`  Provider:  ${status.providerMinerId}`)
  console.log(`  Expires:   ${epochsToHuman(status.epochsUntilExpiry)} (~${status.daysUntilExpiry.toFixed(1)} days)`)
  console.log(`  Status:    ${status.status}`)
  console.log(`  Cost:      $${status.renewalCostUsdc} USDC`)
  console.log(`  Action:    ${status.needsRenewal ? '⚠️  NEEDS RENEWAL' : '✅  OK'}`)

  // ── Step 2: Renew ──────────────────────────────────────────────────────────
  console.log('\n── Renewing deal via x402...')
  console.log('   (no wallet popup, no MetaMask, no human approval)')

  try {
    const result = await sk.renewDeal(DEAL_ID, { maxPriceUsdc: 1.00 })
    console.log(`\n✅ Deal renewed!`)
    console.log(`  New expiry:  epoch ${result.newExpiryEpoch}`)
    console.log(`  Cost paid:   $${result.actualCostUsdc} USDC`)
    console.log(`  Filecoin TX: ${result.filfoxUrl}`)
    console.log(`  USDC TX:     ${result.basescanUrl}`)
  } catch (e) {
    if (e instanceof DealExpiredError) {
      console.log('⚠️  Deal already expired — cannot renew')
    } else if (e instanceof PriceExceededError) {
      console.log(`⚠️  Too expensive: $${e.actualCostUsdc}`)
    } else {
      throw e
    }
  }

  // ── Step 3: Enable autopilot ───────────────────────────────────────────────
  console.log('\n── Enabling autopilot...')
  await sk.enableAutopilot({
    dealId: DEAL_ID,
    renewWhenEpochsLeft: 100_000,
    maxPriceUsdc: 1.00,
  })
  console.log('✅ Autopilot active. This deal will never expire.')
  console.log('   BlobMaster checks every 6 hours.')
  console.log('   Wallet pays $0.25 USDC automatically when renewal triggers.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
