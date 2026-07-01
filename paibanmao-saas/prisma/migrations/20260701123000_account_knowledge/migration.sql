CREATE TABLE "AccountKnowledgeItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'note',
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountKnowledgeItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountKnowledgeItem_workspaceId_updatedAt_idx" ON "AccountKnowledgeItem"("workspaceId", "updatedAt");
CREATE INDEX "AccountKnowledgeItem_accountProfileId_active_idx" ON "AccountKnowledgeItem"("accountProfileId", "active");
CREATE INDEX "AccountKnowledgeItem_sourceType_idx" ON "AccountKnowledgeItem"("sourceType");

ALTER TABLE "AccountKnowledgeItem"
ADD CONSTRAINT "AccountKnowledgeItem_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountKnowledgeItem"
ADD CONSTRAINT "AccountKnowledgeItem_accountProfileId_fkey"
FOREIGN KEY ("accountProfileId") REFERENCES "AccountProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
