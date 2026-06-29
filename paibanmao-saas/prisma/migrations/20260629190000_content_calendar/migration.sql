CREATE TABLE "ContentCalendarItem" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "accountProfileId" TEXT,
  "topicId" TEXT,
  "projectId" TEXT,
  "entry" "ContentEntry" NOT NULL,
  "title" TEXT NOT NULL,
  "status" "TopicStatus" NOT NULL DEFAULT 'ready',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentCalendarItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentCalendarItem_workspaceId_scheduledFor_idx" ON "ContentCalendarItem"("workspaceId", "scheduledFor");
CREATE INDEX "ContentCalendarItem_workspaceId_status_idx" ON "ContentCalendarItem"("workspaceId", "status");
CREATE INDEX "ContentCalendarItem_workspaceId_entry_idx" ON "ContentCalendarItem"("workspaceId", "entry");

ALTER TABLE "ContentCalendarItem"
  ADD CONSTRAINT "ContentCalendarItem_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentCalendarItem"
  ADD CONSTRAINT "ContentCalendarItem_accountProfileId_fkey"
  FOREIGN KEY ("accountProfileId") REFERENCES "AccountProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentCalendarItem"
  ADD CONSTRAINT "ContentCalendarItem_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentCalendarItem"
  ADD CONSTRAINT "ContentCalendarItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
