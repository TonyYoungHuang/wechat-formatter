CREATE TYPE "AuthTokenPurpose" AS ENUM ('email_verification', 'password_reset');

ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "AuthToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "AuthTokenPurpose" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");
CREATE INDEX "AuthToken_userId_purpose_expiresAt_idx" ON "AuthToken"("userId", "purpose", "expiresAt");
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");
CREATE INDEX "LoginAttempt_ipAddress_createdAt_idx" ON "LoginAttempt"("ipAddress", "createdAt");
CREATE INDEX "LoginAttempt_success_createdAt_idx" ON "LoginAttempt"("success", "createdAt");

ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
