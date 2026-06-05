-- CreateTable
CREATE TABLE "Autopilot" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "renewWhenEpochsLeft" INTEGER NOT NULL DEFAULT 100000,
    "maxPriceUsdc" DOUBLE PRECISION NOT NULL DEFAULT 1.00,
    "webhookUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Autopilot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalHistory" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "lighthouseJobId" TEXT NOT NULL,
    "epochAtRenewal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Autopilot_dealId_key" ON "Autopilot"("dealId");

-- AddForeignKey
ALTER TABLE "RenewalHistory" ADD CONSTRAINT "RenewalHistory_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Autopilot"("dealId") ON DELETE RESTRICT ON UPDATE CASCADE;
