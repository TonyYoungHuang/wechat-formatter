CREATE TABLE "ActivationCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codePrefix" TEXT NOT NULL,
    "codeSuffix" TEXT NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxRedemptions" INTEGER NOT NULL DEFAULT 1,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER,
    "batchName" TEXT,
    "source" TEXT DEFAULT 'ecommerce',
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivationCodeRedemption" (
    "id" TEXT NOT NULL,
    "activationCodeId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "beforePlanCode" "PlanCode" NOT NULL,
    "subscriptionExpiresAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationCodeRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivationCode_codeHash_key" ON "ActivationCode"("codeHash");
CREATE INDEX "ActivationCode_planCode_status_idx" ON "ActivationCode"("planCode", "status");
CREATE INDEX "ActivationCode_createdAt_idx" ON "ActivationCode"("createdAt");
CREATE INDEX "ActivationCode_expiresAt_idx" ON "ActivationCode"("expiresAt");

CREATE UNIQUE INDEX "ActivationCodeRedemption_activationCodeId_workspaceId_key" ON "ActivationCodeRedemption"("activationCodeId", "workspaceId");
CREATE INDEX "ActivationCodeRedemption_workspaceId_redeemedAt_idx" ON "ActivationCodeRedemption"("workspaceId", "redeemedAt");
CREATE INDEX "ActivationCodeRedemption_userId_redeemedAt_idx" ON "ActivationCodeRedemption"("userId", "redeemedAt");

ALTER TABLE "ActivationCodeRedemption"
ADD CONSTRAINT "ActivationCodeRedemption_activationCodeId_fkey"
FOREIGN KEY ("activationCodeId") REFERENCES "ActivationCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivationCodeRedemption"
ADD CONSTRAINT "ActivationCodeRedemption_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivationCodeRedemption"
ADD CONSTRAINT "ActivationCodeRedemption_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
