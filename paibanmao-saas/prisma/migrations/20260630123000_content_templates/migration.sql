-- CreateTable
CREATE TABLE "ContentTemplate" (
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

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentTemplate_workspaceId_active_idx" ON "ContentTemplate"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "ContentTemplate_accountProfileId_idx" ON "ContentTemplate"("accountProfileId");

-- CreateIndex
CREATE INDEX "ContentTemplate_entry_idx" ON "ContentTemplate"("entry");

-- AddForeignKey
ALTER TABLE "ContentTemplate" ADD CONSTRAINT "ContentTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTemplate" ADD CONSTRAINT "ContentTemplate_accountProfileId_fkey" FOREIGN KEY ("accountProfileId") REFERENCES "AccountProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
