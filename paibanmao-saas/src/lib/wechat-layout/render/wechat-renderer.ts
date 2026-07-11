import type { ArticleBlock, ArticleDocument, InlineSegment, WechatRenderResult, WechatTheme } from "../types";
import { auditWechatLayout } from "../audit";
import { sanitizeRenderedWechatHtml } from "../compatibility/sanitize";
import { getWechatTheme } from "../themes";
import { articleDocumentText, contentFingerprint, escapeAttribute, escapeHtml } from "../utils";

function renderInline(text: string, segments: InlineSegment[] | undefined, theme: WechatTheme) {
  const renderSegment = (segment: InlineSegment) => {
    let html = escapeHtml(segment.text).replaceAll("\n", "<br />");
    if (segment.bold) html = `<strong style="${theme.styles.strong}">${html}</strong>`;
    if (segment.italic) html = `<em style="${theme.styles.emphasis}">${html}</em>`;
    if (segment.href && /^https?:\/\//i.test(segment.href)) {
      html = `<a href="${escapeAttribute(segment.href)}" style="${theme.styles.link}">${html}</a>`;
    }
    return html;
  };

  return segments?.length
    ? segments.map(renderSegment).join("")
    : escapeHtml(text).replaceAll("\n", "<br />");
}

function renderHeading(text: string, level: 2 | 3, theme: WechatTheme, segments?: InlineSegment[]) {
  const wrapStyle = level === 2 ? theme.styles.h2Wrap : theme.styles.h3Wrap;
  const textStyle = level === 2 ? theme.styles.h2Text : theme.styles.h3Text;
  return `<section style="${wrapStyle}"><span style="${textStyle}">${renderInline(text, segments, theme)}</span></section>`;
}

function renderList(block: Extract<ArticleBlock, { type: "list" }>, theme: WechatTheme) {
  const rows = block.items.map((item, index) => {
    const bullet = block.ordered ? String(index + 1) : "•";
    return `<section style="${theme.styles.listRow}"><span style="${theme.styles.listBullet}">${bullet}</span><span style="${theme.styles.listText}">${renderInline(item.text, item.segments, theme)}</span></section>`;
  });
  return `<section style="${theme.styles.listWrap}">${rows.join("")}</section>`;
}

function renderBlock(block: ArticleBlock, theme: WechatTheme): string {
  switch (block.type) {
    case "lead":
      return `<section style="${theme.styles.leadWrap}"><p style="${theme.styles.leadText}">${renderInline(block.text, block.segments, theme)}</p></section>`;
    case "heading":
      return renderHeading(block.text, block.level, theme, block.segments);
    case "paragraph":
      return `<p style="${theme.styles.paragraph}">${renderInline(block.text, block.segments, theme)}</p>`;
    case "quote":
      return `<section style="${theme.styles.quoteWrap}"><p style="${theme.styles.quoteText}">${renderInline(block.text, block.segments, theme)}</p>${block.source ? `<p style="${theme.styles.quoteSource}">—— ${escapeHtml(block.source)}</p>` : ""}</section>`;
    case "callout":
      return `<section style="${theme.styles.calloutWrap}">${block.title ? `<p style="${theme.styles.calloutTitle}">${escapeHtml(block.title)}</p>` : ""}<p style="${theme.styles.calloutText}">${renderInline(block.text, block.segments, theme)}</p></section>`;
    case "list":
      return renderList(block, theme);
    case "steps":
      return `<section style="${theme.styles.listWrap}">${block.title ? renderHeading(block.title, 3, theme) : ""}${block.items.map((item, index) => `<section style="${theme.styles.stepRow}"><span style="${theme.styles.stepNumber}">${index + 1}</span><span style="${theme.styles.stepText}">${escapeHtml(item)}</span></section>`).join("")}</section>`;
    case "compare": {
      const rows = Math.max(block.left.length, block.right.length);
      const left = Array.from({ length: rows }, (_, index) => block.left[index] ? `<p style="${theme.styles.calloutText}">${escapeHtml(block.left[index])}</p>` : "").join("");
      const right = Array.from({ length: rows }, (_, index) => block.right[index] ? `<p style="${theme.styles.calloutText}">${escapeHtml(block.right[index])}</p>` : "").join("");
      return `${block.title ? renderHeading(block.title, 3, theme) : ""}<section style="${theme.styles.compareWrap}"><section style="${theme.styles.compareColumn}">${left}</section><section style="${theme.styles.compareColumn}">${right}</section></section>`;
    }
    case "dialogue":
      return `<section style="${theme.styles.dialogueWrap}">${block.title ? `<p style="${theme.styles.calloutTitle}">${escapeHtml(block.title)}</p>` : ""}${block.items.map((item) => `<p style="${theme.styles.dialogueSpeaker}">${escapeHtml(item.speaker)}</p><p style="${theme.styles.dialogueText}">${escapeHtml(item.text)}</p>`).join("")}</section>`;
    case "stat":
      return `<section style="${theme.styles.statWrap}"><p style="${theme.styles.statValue}">${escapeHtml(block.value)}</p><p style="${theme.styles.statLabel}">${escapeHtml(block.label)}</p></section>`;
    case "image":
      return `<section style="display:block;margin:0;padding:0;"><img src="${escapeAttribute(block.src)}" alt="${escapeAttribute(block.alt || "")}" style="${theme.styles.image}" />${block.caption ? `<p style="${theme.styles.imageCaption}">${escapeHtml(block.caption)}</p>` : ""}</section>`;
    case "imageGroup":
      return `<section style="display:block;margin:20px 0;padding:0;">${block.images.map((image) => `<img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.alt || "")}" style="${theme.styles.image}" />${image.caption ? `<p style="${theme.styles.imageCaption}">${escapeHtml(image.caption)}</p>` : ""}`).join("")}</section>`;
    case "cta":
      return `<section style="${theme.styles.ctaWrap}">${block.title ? `<p style="${theme.styles.ctaTitle}">${escapeHtml(block.title)}</p>` : ""}<p style="${theme.styles.ctaText}">${renderInline(block.text, block.segments, theme)}</p></section>`;
    case "divider":
      return `<section style="${theme.styles.divider}"></section>`;
    case "byline":
      return `<section style="${theme.styles.bylineWrap}">${block.author ? `<p style="${theme.styles.bylineAuthor}">${escapeHtml(block.author)}</p>` : ""}<p style="${theme.styles.bylineText}">${renderInline(block.text, block.segments, theme)}</p></section>`;
  }
}

export function renderWechatDocument(document: ArticleDocument, themeInput?: string | null): WechatRenderResult {
  const theme = getWechatTheme(themeInput);
  const title = `<section style="${theme.styles.titleWrap}"><span style="${theme.styles.titleText}">${escapeHtml(document.title)}</span></section>`;
  const subtitle = document.subtitle ? `<p style="${theme.styles.subtitle}">${escapeHtml(document.subtitle)}</p>` : "";
  const body = document.blocks.map((block) => renderBlock(block, theme)).join("");
  const html = sanitizeRenderedWechatHtml(`<section style="${theme.styles.root}">${title}${subtitle}${body}</section>`);
  const text = articleDocumentText(document);
  const audit = auditWechatLayout(document, theme, html);

  return {
    html,
    text,
    themeId: theme.id,
    themeVersion: theme.version,
    fingerprint: contentFingerprint(`${theme.id}@${theme.version}:${html}`),
    audit,
  };
}
