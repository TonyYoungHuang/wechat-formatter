-- CreateTable
CREATE TABLE "ContentMetric" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "entry" "ContentEntry",
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "watchCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "followerGain" INTEGER NOT NULL DEFAULT 0,
    "consultationCount" INTEGER NOT NULL DEFAULT 0,
    "dealCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentMetric_projectId_recordedAt_idx" ON "ContentMetric"("projectId", "recordedAt");

-- CreateIndex
CREATE INDEX "ContentMetric_entry_idx" ON "ContentMetric"("entry");

-- AddForeignKey
ALTER TABLE "ContentMetric" ADD CONSTRAINT "ContentMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
