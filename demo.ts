import { BlobMaster, epochsToHuman, BlobExpiredError, PriceExceededError } from './blobmaster-sdk/src/index'
import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const BLOB_ID = process.env.BLOB_ID ?? '_xH_wK4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4n_VwT4'

// x402 relies on viem/EVM for USDC payment gates
const account = privateKeyToAccount(`0x${process.env.DEMO_KEY}` as `0x${string}`)
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http() })
const sk = new BlobMaster({ x402Wallet: wallet, network: 'testnet' })

async function main() {
  // 1. Check blob health 
  console.log('\n🔍 Checking blob status...')
  const status = await sk.getBlobStatus(BLOB_ID)

  console.log(`Blob ${BLOB_ID}:`)
  console.log(`  Storage Node:  ${status.storageNodeId}`)
  console.log(`  Expires:   ${epochsToHuman(status.epochsUntilExpiry)} (~${status.daysUntilExpiry.toFixed(1)} days)`)
  console.log(`  Status:    ${status.status}`)
  console.log(`  Cost:      $${status.extensionCostUsdc} USDC`)
  console.log(`  Action:    ${status.needsExtension ? '❌  NEEDS EXTENSION' : '✅  OK'}`)

  // 2. Extend via Walrus Publisher & x402 payment
  console.log('\n🚀 Extending blob via x402...')
  console.log('   (no wallet popup, no MetaMask, no human approval)')

  try {
    const result = await sk.extendBlob(BLOB_ID, { maxPriceUsdc: 1.00 })
    console.log(`\n✅ Blob extended!`)
    console.log(`  New expiry:  epoch ${result.newExpiryEpoch}`)
    console.log(`  Cost paid:   $${result.actualCostUsdc} USDC`)
    console.log(`  SUI TX:      ${result.suivisionUrl}`)
    console.log(`  USDC TX:     ${result.basescanUrl}`)
  } catch (e) {
    if (e instanceof BlobExpiredError) {
      console.log('❌  Blob already expired — cannot extend')
    } else if (e instanceof PriceExceededError) {
      console.log(`❌  Too expensive: $${e.actualCostUsdc}`)
    } else {
      throw e
    }
  }

  // 3. Enable autopilot 
  console.log('\n🤖 Enabling autopilot...')
  await sk.enableAutopilot({
    blobId: BLOB_ID,
    renewWhenEpochsLeft: 100_000,
    maxPriceUsdc: 1.00,
  })
  console.log('✅ Autopilot active. This blob will automatically extend.')
  console.log('   BlobMaster background cron checks every 6 hours.')
  console.log('   Vault wallet pays $0.25 USDC automatically when threshold triggers.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
