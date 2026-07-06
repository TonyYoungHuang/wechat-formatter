import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

const stopPhrases = [
  "这个",
  "一个",
  "我们",
  "他们",
  "自己",
  "就是",
  "可以",
  "不是",
  "没有",
  "因为",
  "所以",
  "如果",
  "但是",
  "然后",
  "其实",
  "很多",
  "需要",
  "内容",
  "文章",
  "公众号",
  "小绿书",
  "朋友圈",
  "怎么",
  "什么",
];

function normalizeTag(tag: string) {
  return tag
    .replace(/[^\p{Script=Han}A-Za-z0-9+#·\-]/gu, "")
    .trim()
    .slice(0, 24);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const tag = normalizeTag(value);
    if (!tag || tag.length < 2 || seen.has(tag) || stopPhrases.includes(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }

  return result;
}

function extractChinesePhrases(text: string) {
  const normalized = text.replace(/\s+/g, "");
  const phrases = normalized.match(/[\p{Script=Han}A-Za-z0-9+#·\-]{2,16}/gu) ?? [];
  const scored = new Map<string, number>();

  for (const phrase of phrases) {
    const clean = normalizeTag(phrase);
    if (clean.length < 2 || stopPhrases.some((item) => clean === item || clean.startsWith(item))) continue;
    scored.set(clean, (scored.get(clean) ?? 0) + Math.min(clean.length, 8));
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

function extractSentenceTags(text: string) {
  return text
    .split(/[。！？!?；;\n\r]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 6)
    .map((sentence) => sentence.slice(0, 18));
}

export function buildKnowledgeTags(input: {
  title: string;
  sourceType: string;
  content?: string;
  manualTags?: string[];
}) {
  const content = input.content ?? "";
  const sourceTag = `类型:${input.sourceType}`;
  const titleTags = input.title.split(/[，,、\s]+/).filter(Boolean);
  const manualTags = input.manualTags ?? [];
  const sentenceTags = extractSentenceTags(content).slice(0, 10);
  const phraseTags = extractChinesePhrases(`${input.title}\n${content}`).slice(0, 50);
  const tags = unique([sourceTag, ...manualTags, ...titleTags, ...sentenceTags, ...phraseTags]).slice(0, 80);

  return {
    tags,
    contentDigest: content ? createHash("sha256").update(content).digest("hex") : null,
    contentCharCount: content.length,
  };
}

export type KnowledgeTaggingResult = ReturnType<typeof buildKnowledgeTags>;

type VariantLike = {
  entry: string;
  title: string;
  body: string;
};

export async function recordGeneratedContentTags(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    accountProfileId: string;
    projectTitle: string;
    variants: VariantLike[];
    precomputedTagging?: KnowledgeTaggingResult;
  },
) {
  const combined = input.variants.map((variant) => `${variant.entry}\n${variant.title}\n${variant.body}`).join("\n\n");
  const tagging =
    input.precomputedTagging ??
    buildKnowledgeTags({
      title: `生成内容标签：${input.projectTitle}`,
      sourceType: "generated_content",
      content: combined,
      manualTags: ["系统生成", "自动标签"],
    });

  if (!tagging.tags.length) return;

  await tx.accountKnowledgeItem.create({
    data: {
      workspaceId: input.workspaceId,
      accountProfileId: input.accountProfileId,
      title: `生成内容标签：${input.projectTitle}`.slice(0, 80),
      sourceType: "generated_content",
      content: "",
      contentDigest: tagging.contentDigest,
      contentCharCount: tagging.contentCharCount,
      tags: tagging.tags,
      active: true,
    },
  });
}
