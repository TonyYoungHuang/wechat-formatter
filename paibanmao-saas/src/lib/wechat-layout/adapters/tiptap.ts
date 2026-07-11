import type { ArticleBlock, ArticleDocument, InlineSegment } from "../types";
import { contentFingerprint, createBlockId } from "../utils";

type TiptapMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

export type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  content?: TiptapNode[];
};

function compactSegments(segments: InlineSegment[]) {
  return segments.reduce<InlineSegment[]>((result, segment) => {
    if (!segment.text) return result;
    const previous = result.at(-1);
    if (
      previous &&
      previous.bold === segment.bold &&
      previous.italic === segment.italic &&
      previous.href === segment.href
    ) {
      previous.text += segment.text;
      return result;
    }
    result.push({ ...segment });
    return result;
  }, []);
}

function inlineSegments(nodes: TiptapNode[] = []): InlineSegment[] {
  const segments: InlineSegment[] = [];
  nodes.forEach((node) => {
    if (node.type === "hardBreak") {
      segments.push({ text: "\n" });
      return;
    }
    if (node.type === "text") {
      const marks = node.marks || [];
      const link = marks.find((mark) => mark.type === "link");
      const href = typeof link?.attrs?.href === "string" ? link.attrs.href : undefined;
      segments.push({
        text: node.text || "",
        bold: marks.some((mark) => mark.type === "bold") || undefined,
        italic: marks.some((mark) => mark.type === "italic") || undefined,
        href,
      });
      return;
    }
    if (node.content) {
      segments.push(...inlineSegments(node.content));
    }
  });
  return compactSegments(segments);
}

function nodeText(node: TiptapNode) {
  return inlineSegments(node.content).map((segment) => segment.text).join("").trim();
}

function listItems(node: TiptapNode) {
  return (node.content || [])
    .map((item) => {
      const segments = inlineSegments(item.content);
      const text = segments.map((segment) => segment.text).join("").trim();
      return text ? { text, segments } : null;
    })
    .filter((item): item is { text: string; segments: InlineSegment[] } => Boolean(item));
}

export function createArticleDocumentFromTiptap(
  root: TiptapNode,
  options: { title?: string; sourceType?: ArticleDocument["source"]["type"] } = {},
): ArticleDocument {
  let title = options.title?.trim() || "";
  const blocks: ArticleBlock[] = [];

  function pushNode(node: TiptapNode) {
    const text = nodeText(node);
    const segments = inlineSegments(node.content);

    switch (node.type) {
      case "heading": {
        const level = Number(node.attrs?.level || 2);
        if (level === 1 && text) {
          title = text || title;
          return;
        }
        if (text) {
          blocks.push({ id: createBlockId(blocks.length, "heading"), type: "heading", level: level >= 3 ? 3 : 2, text, segments });
        }
        return;
      }
      case "paragraph":
        if (text) blocks.push({ id: createBlockId(blocks.length, "paragraph"), type: "paragraph", text, segments });
        return;
      case "blockquote":
        if (text) blocks.push({ id: createBlockId(blocks.length, "quote"), type: "quote", text, segments });
        return;
      case "bulletList":
      case "orderedList": {
        const items = listItems(node);
        if (items.length) blocks.push({ id: createBlockId(blocks.length, "list"), type: "list", ordered: node.type === "orderedList", items });
        return;
      }
      case "horizontalRule":
        blocks.push({ id: createBlockId(blocks.length, "divider"), type: "divider" });
        return;
      case "image": {
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
        if (src) {
          blocks.push({
            id: createBlockId(blocks.length, "image"),
            type: "image",
            src,
            alt: typeof node.attrs?.alt === "string" ? node.attrs.alt : undefined,
            caption: typeof node.attrs?.title === "string" ? node.attrs.title : undefined,
          });
        }
        return;
      }
      default:
        (node.content || []).forEach(pushNode);
    }
  }

  (root.content || []).forEach(pushNode);

  if (!title) {
    const firstParagraph = blocks.find((block) => "text" in block && block.text);
    title = firstParagraph && "text" in firstParagraph ? firstParagraph.text.slice(0, 80) : "公众号文章";
  }

  const sourceText = [title, ...blocks.map((block) => {
    if ("text" in block) return block.text;
    if (block.type === "list") return block.items.map((item) => item.text).join("\n");
    return "";
  })].join("\n\n");

  return {
    version: 1,
    title,
    blocks: blocks.length ? blocks : [{ id: "paragraph-001", type: "paragraph", text: "请在这里输入公众号正文。" }],
    source: {
      type: options.sourceType || "tiptap",
      fingerprint: contentFingerprint(sourceText),
    },
  };
}
