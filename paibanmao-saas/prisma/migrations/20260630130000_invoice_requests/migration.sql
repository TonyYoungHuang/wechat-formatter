-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('requested', 'issued', 'rejected', 'cancelled');

-- CreateTable
CREATE TABLE "InvoiceRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "paymentOrderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taxNumber" TEXT,
    "email" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'requested',
    "note" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceRequest_workspaceId_createdAt_idx" ON "InvoiceRequest"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceRequest_paymentOrderId_idx" ON "InvoiceRequest"("paymentOrderId");

-- CreateIndex
CREATE INDEX "InvoiceRequest_status_idx" ON "InvoiceRequest"("status");

-- AddForeignKey
ALTER TABLE "InvoiceRequest" ADD CONSTRAINT "InvoiceRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRequest" ADD CONSTRAINT "InvoiceRequest_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "PaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
