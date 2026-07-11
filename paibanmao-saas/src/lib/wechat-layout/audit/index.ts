import type { ArticleDocument, LayoutAuditIssue, LayoutAuditReport, WechatTheme } from "../types";
import { lintWechatTheme } from "../themes";

export function auditWechatLayout(document: ArticleDocument, theme: WechatTheme, html: string): LayoutAuditReport {
  const issues: LayoutAuditIssue[] = [];
  const headingLevels = document.blocks.filter((block) => block.type === "heading").map((block) => block.level);

  if (!document.title.trim()) {
    issues.push({ code: "missing-title", level: "error", message: "文章缺少主标题。" });
  }
  if (!document.blocks.length) {
    issues.push({ code: "missing-body", level: "error", message: "文章缺少正文。" });
  }
  if (headingLevels[0] === 3) {
    issues.push({ code: "heading-starts-at-three", level: "warning", message: "正文从三级标题开始，建议先补一个一级小标题。" });
  }

  document.blocks.forEach((block) => {
    if (block.type === "heading" && block.text.length > 42) {
      issues.push({ code: "long-heading", level: "warning", message: `小标题“${block.text.slice(0, 18)}...”较长，手机端可能超过三行。` });
    }
    if ("text" in block && !block.text.trim()) {
      issues.push({ code: "empty-block", level: "warning", message: "文章中存在空内容块。" });
    }
  });

  lintWechatTheme(theme).forEach((message) => {
    issues.push({ code: "theme-lint", level: "error", message });
  });

  if (/<(?:script|style|iframe|form|object|embed)\b/i.test(html)) {
    issues.push({ code: "unsafe-tag", level: "error", message: "微信 HTML 中包含不允许的标签。" });
  }
  if (/\sclass=/i.test(html)) {
    issues.push({ code: "class-attribute", level: "error", message: "微信 HTML 仍依赖 class 样式。" });
  }
  if (!/^<section\b/i.test(html.trim())) {
    issues.push({ code: "missing-root-wrapper", level: "error", message: "全文缺少统一背景容器。" });
  }
  if (/javascript:/i.test(html)) {
    issues.push({ code: "unsafe-url", level: "error", message: "微信 HTML 中包含不安全链接。" });
  }
  if (/(?:display:(?:flex|grid)|position:(?:fixed|sticky|absolute)|(?:var|calc)\(|linear-gradient)/i.test(html)) {
    issues.push({ code: "unstable-wechat-css", level: "error", message: "微信 HTML 中包含粘贴后容易丢失的布局样式。" });
  }
  if (!new RegExp(`background:${theme.tokens.colors.background.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(html.slice(0, 900))) {
    issues.push({ code: "missing-root-background", level: "error", message: "全文根容器没有应用当前主题背景。" });
  }

  const paragraphCount = (html.match(/<p\b/gi) || []).length;
  const coloredParagraphCount = (html.match(/<p\b[^>]*style="[^"]*background:(?!transparent)/gi) || []).length;
  if (paragraphCount >= 4 && coloredParagraphCount / paragraphCount > 0.5) {
    issues.push({ code: "paragraph-background-density", level: "warning", message: "正文色块过密，建议只给导语、引用和行动区添加背景。" });
  }

  return {
    passed: !issues.some((issue) => issue.level === "error"),
    issues,
  };
}
