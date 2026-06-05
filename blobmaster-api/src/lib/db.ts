import knex from 'knex'
import path from 'path'
import { randomUUID } from 'crypto'

const db = knex({
  client: 'sqlite3',
  connection: { filename: path.join(process.cwd(), 'blobmaster.db') },
  useNullAsDefault: true,
})

export async function initDb() {
  const hasAutopilots = await db.schema.hasTable('autopilots')
  if (!hasAutopilots) {
    await db.schema.createTable('autopilots', t => {
      t.string('id').primary()
      t.string('deal_id').notNullable().unique()
      t.string('wallet_address').notNullable()
      t.integer('renew_when_epochs_left').notNullable().defaultTo(100000)
      t.float('max_price_usdc').notNullable().defaultTo(1.0)
      t.string('webhook_url').nullable()
      t.string('webhook_secret').nullable()
      t.integer('active').notNullable().defaultTo(1)
      t.timestamp('created_at').defaultTo(db.fn.now())
    })
  }

  const hasRenewals = await db.schema.hasTable('renewals')
  if (!hasRenewals) {
    await db.schema.createTable('renewals', t => {
      t.increments('id')
      t.string('deal_id').notNullable()
      t.string('tx_hash').nullable()
      t.string('payment_tx_hash').nullable()
      t.string('cost_usdc').nullable()
      t.string('lighthouse_job_id').nullable()
      t.integer('new_expiry_epoch').nullable()
      t.timestamp('timestamp').defaultTo(db.fn.now())
    })
  }
}

export interface Autopilot {
  id: string
  deal_id: string
  wallet_address: string
  renew_when_epochs_left: number
  max_price_usdc: number
  webhook_url: string | null
  webhook_secret: string | null
  active: number
}

export const autopilots = {
  async upsert(data: Omit<Autopilot, 'active'>) {
    const existing = await db('autopilots').where({ deal_id: data.deal_id }).first()
    if (existing) {
      await db('autopilots').where({ deal_id: data.deal_id }).update({
        renew_when_epochs_left: data.renew_when_epochs_left,
        max_price_usdc: data.max_price_usdc,
        webhook_url: data.webhook_url,
        webhook_secret: data.webhook_secret,
        active: 1,
      })
    } else {
      await db('autopilots').insert({ ...data, active: 1 })
    }
  },
  async getByDealId(dealId: string): Promise<Autopilot | undefined> {
    return db('autopilots').where({ deal_id: dealId }).first()
  },
  async listActive(): Promise<Autopilot[]> {
    return db('autopilots').where({ active: 1 })
  },
  async disable(dealId: string) {
    await db('autopilots').where({ deal_id: dealId }).update({ active: 0 })
  },
}

export const renewals = {
  async insert(data: { deal_id: string; tx_hash?: string; payment_tx_hash?: string; cost_usdc?: string; lighthouse_job_id?: string; new_expiry_epoch?: number }) {
    await db('renewals').insert(data)
  },
  async getByDealId(dealId: string) {
    return db('renewals').where({ deal_id: dealId }).orderBy('timestamp', 'desc')
  },
  async countTotal(): Promise<number> {
    const [{ count }] = await db('renewals').count('id as count')
    return Number(count)
  },
}

export default db
