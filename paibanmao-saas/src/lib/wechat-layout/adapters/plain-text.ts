import type { ArticleBlock, ArticleDocument, WechatThemeId } from "../types";
import { contentFingerprint, createBlockId } from "../utils";

function stripMarkdownHeading(value: string) {
  return value.replace(/^#{1,6}\s+/, "").trim();
}

function isMajorHeading(value: string) {
  const text = stripMarkdownHeading(value).replace(/\s+/g, " ").trim();
  return (
    text.length >= 3 &&
    text.length <= 42 &&
    (/^[一二三四五六七八九十]+[、.．]/.test(text) ||
      /^\d+[、.．]/.test(text) ||
      /^第[一二三四五六七八九十\d]+[章节部分]/.test(text))
  );
}

function isMinorHeading(value: string) {
  const text = stripMarkdownHeading(value).replace(/\s+/g, " ").trim();
  return (
    text.length >= 3 &&
    text.length <= 38 &&
    (/^[(（][一二三四五六七八九十\d]+[)）]/.test(text) ||
      /^[0-9]+[.)）]/.test(text) ||
      /^[A-Z][.)]/.test(text))
  );
}

function isLikelyHeading(value: string) {
  if (value.trim().includes("\n")) return false;
  const text = stripMarkdownHeading(value).replace(/\s+/g, "").trim();
  return text.length >= 4 && text.length <= 22 && !/[。！？!?；;，,、：:]$/.test(text);
}

function parseList(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const ordered = lines.every((line) => /^\d+[.、）)]\s*/.test(line));
  const unordered = lines.every((line) => /^[-*•·]\s*/.test(line));
  if (!ordered && !unordered) return null;

  return {
    ordered,
    items: lines.map((line) => ({ text: line.replace(/^(?:\d+[.、）)]|[-*•·])\s*/, "").trim() })),
  };
}

function shouldBecomeCta(value: string) {
  return /(关注|私信|留言|评论|咨询|扫码|添加微信|回复关键词|加入社群|领取|点击|转发)/.test(value);
}

function buildBlocks(blocks: string[], themeId: WechatThemeId): ArticleBlock[] {
  const output: ArticleBlock[] = [];

  blocks.forEach((rawBlock, sourceIndex) => {
    const block = rawBlock.trim();
    if (!block) return;

    const id = createBlockId(output.length, "paragraph");
    const explicitHeading = block.match(/^(#{2,3})\s+([\s\S]+)$/);
    if (explicitHeading) {
      output.push({
        id: createBlockId(output.length, "heading"),
        type: "heading",
        level: explicitHeading[1].length === 2 ? 2 : 3,
        text: explicitHeading[2].trim(),
      });
      return;
    }

    const list = parseList(block);
    if (list) {
      output.push({ id: createBlockId(output.length, "list"), type: "list", ...list });
      return;
    }

    if (isMajorHeading(block)) {
      output.push({ id: createBlockId(output.length, "heading"), type: "heading", level: 2, text: stripMarkdownHeading(block) });
      return;
    }

    if (isMinorHeading(block)) {
      output.push({ id: createBlockId(output.length, "heading"), type: "heading", level: 3, text: stripMarkdownHeading(block) });
      return;
    }

    if (isLikelyHeading(block)) {
      output.push({ id: createBlockId(output.length, "heading"), type: "heading", level: 2, text: stripMarkdownHeading(block) });
      return;
    }

    if (block.startsWith(">")) {
      output.push({ id: createBlockId(output.length, "quote"), type: "quote", text: block.replace(/^>\s?/gm, "").trim() });
      return;
    }

    if (sourceIndex === 0 && ["classic-green", "deep-column"].includes(themeId) && block.length <= 260) {
      output.push({ id: createBlockId(output.length, "lead"), type: "lead", text: block });
      return;
    }

    if (themeId === "private-conversion" && sourceIndex === blocks.length - 1 && shouldBecomeCta(block)) {
      output.push({ id: createBlockId(output.length, "cta"), type: "cta", title: "下一步", text: block });
      return;
    }

    output.push({ id, type: "paragraph", text: block });
  });

  return output.length ? output : [{ id: "paragraph-001", type: "paragraph", text: "请在这里输入公众号正文。" }];
}

export function createArticleDocumentFromText(
  content: string,
  options: { title?: string; themeId?: WechatThemeId; sourceType?: ArticleDocument["source"]["type"] } = {},
): ArticleDocument {
  const normalized = content.replace(/\r\n?/g, "\n").trim();
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const firstBlock = rawBlocks[0] || "";
  const explicitH1 = firstBlock.match(/^#\s+([\s\S]+)$/)?.[1]?.trim();
  const suppliedTitle = options.title?.trim();
  const inferredTitle = explicitH1 || stripMarkdownHeading(firstBlock).slice(0, 80) || "公众号文章";
  const title = suppliedTitle || inferredTitle;
  const firstMatchesTitle = stripMarkdownHeading(firstBlock).replace(/\s+/g, "") === title.replace(/\s+/g, "");
  const bodyBlocks = explicitH1 || firstMatchesTitle ? rawBlocks.slice(1) : rawBlocks;
  const themeId = options.themeId || "classic-green";

  return {
    version: 1,
    title,
    blocks: buildBlocks(bodyBlocks, themeId),
    source: {
      type: options.sourceType || (normalized.includes("# ") ? "markdown" : "plain"),
      fingerprint: contentFingerprint(normalized),
    },
  };
}

export { isMajorHeading, isMinorHeading, isLikelyHeading };
