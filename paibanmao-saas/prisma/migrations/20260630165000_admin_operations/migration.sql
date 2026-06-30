ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'refunded';

ALTER TABLE "Workspace"
  ADD COLUMN "riskStatus" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "riskNote" TEXT,
  ADD COLUMN "riskFlaggedAt" TIMESTAMP(3);

CREATE INDEX "Workspace_riskStatus_idx" ON "Workspace"("riskStatus");
