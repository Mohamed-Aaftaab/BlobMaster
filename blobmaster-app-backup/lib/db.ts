import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? (() => {
  try {
    const client = new PrismaClient()
    globalForPrisma.prisma = client
    return client
  } catch {
    return undefined as unknown as PrismaClient
  }
})()