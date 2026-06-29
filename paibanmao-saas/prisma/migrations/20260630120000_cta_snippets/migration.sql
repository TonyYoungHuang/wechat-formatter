-- CreateTable
CREATE TABLE "CtaSnippet" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountProfileId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entry" "ContentEntry",
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CtaSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CtaSnippet_workspaceId_active_idx" ON "CtaSnippet"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "CtaSnippet_accountProfileId_idx" ON "CtaSnippet"("accountProfileId");

-- CreateIndex
CREATE INDEX "CtaSnippet_entry_idx" ON "CtaSnippet"("entry");

-- AddForeignKey
ALTER TABLE "CtaSnippet" ADD CONSTRAINT "CtaSnippet_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaSnippet" ADD CONSTRAINT "CtaSnippet_accountProfileId_fkey" FOREIGN KEY ("accountProfileId") REFERENCES "AccountProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
