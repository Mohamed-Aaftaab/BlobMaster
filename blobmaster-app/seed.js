
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding fake data...')
  
  // Create 42 autopilots
  for (let i = 0; i < 42; i++) {
    const blobId = `fake_blob_${Math.random().toString(36).slice(2)}`
    await prisma.autopilot.create({
      data: {
        blobId,
        renewWhenEpochsLeft: 100000,
        maxPriceUsdc: 2.50,
        active: true,
        renewals: {
          create: Array.from({ length: Math.floor(Math.random() * 5) + 1 }).map(() => ({
            txHash: `0x${Math.random().toString(16).slice(2)}`,
            walrusJobId: `job_${Math.random().toString(36).slice(2)}`,
            epochAtRenewal: 500000 + Math.floor(Math.random() * 1000),
          }))
        }
      }
    })
  }
  
  console.log('Done seeding!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
