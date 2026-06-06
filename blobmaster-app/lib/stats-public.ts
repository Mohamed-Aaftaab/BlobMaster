import { prisma } from '@/lib/db'

/** Home / static contexts: read DB directly (no HTTP) so `next build` never calls localhost. */
export async function getHomeStats(): Promise<{ totalRenewals: number; activeAutopilots: number }> {
  if (!prisma) {
    return { totalRenewals: 0, activeAutopilots: 0 }
  }
  try {
    const [totalRenewals, activeAutopilots] = await Promise.all([
      prisma.renewalHistory.count(),
      prisma.autopilot.count({ where: { active: true } }),
    ])
    return { totalRenewals, activeAutopilots }
  } catch {
    return { totalRenewals: 0, activeAutopilots: 0 }
  }
}
