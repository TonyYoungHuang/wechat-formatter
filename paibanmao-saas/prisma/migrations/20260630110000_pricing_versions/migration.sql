-- CreateTable
CREATE TABLE "PricingVersion" (
    "id" TEXT NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingVersion_planCode_version_key" ON "PricingVersion"("planCode", "version");

-- CreateIndex
CREATE INDEX "PricingVersion_createdAt_idx" ON "PricingVersion"("createdAt");

-- AddForeignKey
ALTER TABLE "PricingVersion" ADD CONSTRAINT "PricingVersion_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "PricingPlan"("code") ON DELETE CASCADE ON UPDATE CASCADE;
