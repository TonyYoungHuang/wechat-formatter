ALTER TABLE "AccountKnowledgeItem"
ADD COLUMN "contentDigest" TEXT,
ADD COLUMN "contentCharCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AccountKnowledgeItem"
ALTER COLUMN "content" SET DEFAULT '';

UPDATE "AccountKnowledgeItem"
SET
  "contentDigest" = md5("content"),
  "contentCharCount" = char_length("content"),
  "content" = '';
