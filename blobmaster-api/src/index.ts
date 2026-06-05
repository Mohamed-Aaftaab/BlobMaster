import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { paymentMiddleware } from '@x402/express'
import { facilitator } from '@coinbase/x402'
import { blobsRouter } from './blobs/router'
import { autopilotRouter } from './autopilot/router'
import { startCron } from './autopilot/cron'
import { renewals, autopilots, initDb } from './lib/db'

const app = express()
app.use(cors())
app.use(express.json())

const WALLET_ADDRESS = process.env.BLOBMASTER_WALLET_ADDRESS as `0x${string}`

// x402 payment middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((paymentMiddleware as any)(
  {
    'POST /api/blobs/:blobId/extend': {
      accepts: { scheme: 'exact', payTo: WALLET_ADDRESS, price: '$0.25', network: 'eip155:84532' },
      description: 'Extend a Walrus storage blob natively on Sui',
    },
    'POST /api/autopilot': {
      accepts: { scheme: 'exact', payTo: WALLET_ADDRESS, price: '$0.10', network: 'eip155:84532' },
      description: 'Register a blob for autopilot extension monitoring',
    },
  },
  facilitator
))

app.use('/api/blobs', blobsRouter)
app.use('/api/autopilot', autopilotRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/stats', async (_req, res) => {
  const [total, active] = await Promise.all([renewals.countTotal(), autopilots.listActive()])
  res.json({ totalExtensions: total, activeAutopilots: active.length })
})

const PORT = process.env.PORT ?? 3000

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`BlobMaster API running on port ${PORT}`)
    startCron()
  })
}).catch(err => {
  console.error('DB init failed:', err)
  process.exit(1)
})
