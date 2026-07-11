import type { ArticleBlock, ArticleDocument } from "./types";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function contentFingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}-${value.length}`;
}

export function normalizeComparableText(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/[#*_`>\[\](){}~]/g, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .toLowerCase();
}

export function articleBlockText(block: ArticleBlock): string {
  switch (block.type) {
    case "list":
      return block.items.map((item) => item.text).join("\n");
    case "steps":
      return [block.title, ...block.items].filter(Boolean).join("\n");
    case "compare":
      return [block.title, ...block.left, ...block.right].filter(Boolean).join("\n");
    case "dialogue":
      return [block.title, ...block.items.map((item) => `${item.speaker}：${item.text}`)].filter(Boolean).join("\n");
    case "stat":
      return `${block.value}\n${block.label}`;
    case "image":
      return [block.alt, block.caption].filter(Boolean).join("\n");
    case "imageGroup":
      return block.images.map((image) => [image.alt, image.caption].filter(Boolean).join(" ")).join("\n");
    case "divider":
      return "";
    default:
      return block.text;
  }
}

export function articleDocumentText(document: ArticleDocument) {
  return [document.title, ...document.blocks.map(articleBlockText)].filter(Boolean).join("\n\n");
}

export function createBlockId(index: number, type: ArticleBlock["type"]) {
  return `${type}-${String(index + 1).padStart(3, "0")}`;
}
