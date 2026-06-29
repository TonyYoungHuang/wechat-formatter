CREATE TABLE "PaymentCallback" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT,
  "paymentOrderId" TEXT,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "eventType" TEXT,
  "providerTradeNo" TEXT,
  "rawBody" TEXT NOT NULL,
  "payload" JSONB,
  "signature" TEXT,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentCallback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentCallback_provider_status_createdAt_idx" ON "PaymentCallback"("provider", "status", "createdAt");
CREATE INDEX "PaymentCallback_workspaceId_createdAt_idx" ON "PaymentCallback"("workspaceId", "createdAt");
CREATE INDEX "PaymentCallback_paymentOrderId_createdAt_idx" ON "PaymentCallback"("paymentOrderId", "createdAt");

ALTER TABLE "PaymentCallback"
  ADD CONSTRAINT "PaymentCallback_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentCallback"
  ADD CONSTRAINT "PaymentCallback_paymentOrderId_fkey"
  FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
