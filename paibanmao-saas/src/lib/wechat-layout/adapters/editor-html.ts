import type { ArticleDocument, InlineSegment } from "../types";
import { escapeAttribute, escapeHtml } from "../utils";

function renderInline(text: string, segments?: InlineSegment[]) {
  const renderSegment = (segment: InlineSegment) => {
    let html = escapeHtml(segment.text).replaceAll("\n", "<br />");
    if (segment.bold) html = `<strong>${html}</strong>`;
    if (segment.italic) html = `<em>${html}</em>`;
    if (segment.href && /^https?:\/\//i.test(segment.href)) {
      html = `<a href="${escapeAttribute(segment.href)}">${html}</a>`;
    }
    return html;
  };
  return segments?.length
    ? segments.map(renderSegment).join("")
    : escapeHtml(text).replaceAll("\n", "<br />");
}

export function articleDocumentToEditorHtml(document: ArticleDocument) {
  const blocks = document.blocks.map((block) => {
    switch (block.type) {
      case "lead":
        return `<blockquote>${renderInline(block.text, block.segments)}</blockquote>`;
      case "heading":
        return `<h${block.level}>${renderInline(block.text, block.segments)}</h${block.level}>`;
      case "paragraph":
        return `<p>${renderInline(block.text, block.segments)}</p>`;
      case "quote":
        return `<blockquote>${renderInline(block.text, block.segments)}${block.source ? `<p>—— ${escapeHtml(block.source)}</p>` : ""}</blockquote>`;
      case "callout":
        return `<blockquote>${block.title ? `<strong>${escapeHtml(block.title)}</strong><br />` : ""}${renderInline(block.text, block.segments)}</blockquote>`;
      case "list": {
        const tag = block.ordered ? "ol" : "ul";
        return `<${tag}>${block.items.map((item) => `<li>${renderInline(item.text, item.segments)}</li>`).join("")}</${tag}>`;
      }
      case "steps":
        return `<ol>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
      case "compare":
        return `<h3>${escapeHtml(block.title || "对比")}</h3><ul>${block.left.map((item, index) => `<li>${escapeHtml(item)}${block.right[index] ? `；${escapeHtml(block.right[index])}` : ""}</li>`).join("")}</ul>`;
      case "dialogue":
        return `${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ""}${block.items.map((item) => `<p><strong>${escapeHtml(item.speaker)}：</strong>${escapeHtml(item.text)}</p>`).join("")}`;
      case "stat":
        return `<blockquote><strong>${escapeHtml(block.value)}</strong><br />${escapeHtml(block.label)}</blockquote>`;
      case "image":
        return `<img src="${escapeAttribute(block.src)}" alt="${escapeAttribute(block.alt || "")}"${block.caption ? ` title="${escapeAttribute(block.caption)}"` : ""} />`;
      case "imageGroup":
        return block.images.map((image) => `<img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.alt || "")}"${image.caption ? ` title="${escapeAttribute(image.caption)}"` : ""} />`).join("");
      case "cta":
        return `<blockquote>${block.title ? `<strong>${escapeHtml(block.title)}</strong><br />` : ""}${renderInline(block.text, block.segments)}</blockquote>`;
      case "divider":
        return "<hr />";
      case "byline":
        return `<blockquote>${block.author ? `<strong>${escapeHtml(block.author)}</strong><br />` : ""}${renderInline(block.text, block.segments)}</blockquote>`;
    }
  });

  return [`<h1>${escapeHtml(document.title)}</h1>`, ...blocks].join("\n");
}
