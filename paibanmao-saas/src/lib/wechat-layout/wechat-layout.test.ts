import { describe, expect, it } from "vitest";

import {
  articleDocumentToEditorHtml,
  createArticleDocumentFromText,
  createArticleDocumentFromTiptap,
  renderWechatDocument,
  resolveWechatThemeId,
  wechatThemes,
} from "./index";
import { premiumThemeSamples, wechatPasteRegressionDocument } from "./fixtures";
import { articleDocumentSchema } from "./schemas";

describe("Paibanmao WeChat layout engine", () => {
  it("builds a structured document from Chinese article text", () => {
    const document = createArticleDocumentFromText(
      [
        "公众号运营复盘",
        "这是一段导语，先说明文章解决什么问题。",
        "一、先找准读者",
        "正文内容要围绕读者的真实问题展开。",
        "（一）不要只写自己想写的",
        "- 记录常见问题\n- 观察搜索词\n- 收集读者反馈",
      ].join("\n\n"),
      { themeId: "classic-green" },
    );

    expect(document.title).toBe("公众号运营复盘");
    expect(document.blocks.map((block) => block.type)).toEqual(["lead", "heading", "paragraph", "heading", "list"]);
    expect(document.blocks.find((block) => block.type === "heading" && block.level === 3)).toBeTruthy();
  });

  it("renders all themes as standalone inline-style WeChat HTML", () => {
    const document = createArticleDocumentFromText(
      "排版猫测试文章\n\n这是一段导语。\n\n一、一级小标题\n\n正文不应该每段都有色块背景。\n\n（一）二级小标题\n\n> 这是一段引用。",
      { themeId: "classic-green" },
    );

    Object.values(wechatThemes).forEach((theme) => {
      const result = renderWechatDocument(document, theme.id);
      expect(result.audit.passed).toBe(true);
      expect(result.html).toMatch(/^<section style=/);
      expect(result.html).not.toMatch(/\sclass=/i);
      expect(result.html).not.toMatch(/<style\b/i);
      expect(result.html).not.toMatch(/<script\b/i);
      expect(result.html).toContain(`font-size:${theme.tokens.typography.titleSize}px`);
      expect(result.html).toContain(`font-size:${theme.tokens.typography.bodySize}px`);
    });
  });

  it("keeps Tiptap bold, italic and link marks in the final render", () => {
    const document = createArticleDocumentFromTiptap({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "测试标题" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "重点", marks: [{ type: "bold" }] },
            { type: "text", text: "与" },
            { type: "text", text: "链接", marks: [{ type: "italic" }, { type: "link", attrs: { href: "https://paibanmao.cn" } }] },
          ],
        },
      ],
    });
    const result = renderWechatDocument(document, "clean-reading");

    expect(document.title).toBe("测试标题");
    expect(result.html).toContain("<strong style=");
    expect(result.html).toContain("<em style=");
    expect(result.html).toContain('href="https://paibanmao.cn"');
    expect(articleDocumentToEditorHtml(document)).toContain("<strong>重点</strong>");
  });

  it("keeps legacy template values compatible", () => {
    expect(resolveWechatThemeId("clean")).toBe("clean-reading");
    expect(resolveWechatThemeId("deep")).toBe("deep-column");
    expect(resolveWechatThemeId("private")).toBe("private-conversion");
    expect(resolveWechatThemeId("checklist")).toBe("tutorial-list");
    expect(resolveWechatThemeId("editorial")).toBe("classic-green");
  });

  it("ships ten distinct premium themes", () => {
    expect(Object.keys(wechatThemes)).toHaveLength(10);
    expect(premiumThemeSamples).toHaveLength(5);
    premiumThemeSamples.forEach(({ themeId }) => {
      expect(wechatThemes[themeId]).toBeTruthy();
      expect(wechatThemes[themeId].recommendedFor.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("renders the comprehensive paste fixture across every premium theme", () => {
    expect(articleDocumentSchema.safeParse(wechatPasteRegressionDocument).success).toBe(true);

    Object.values(wechatThemes).forEach((theme) => {
      const result = renderWechatDocument(wechatPasteRegressionDocument, theme.id);
      expect(result.audit.passed).toBe(true);
      expect(result.text).toContain("排版猫微信公众号粘贴兼容测试");
      expect(result.html).toContain("用户最常问的两个问题");
      expect(result.html).toContain("https://paibanmao.cn");
      expect(result.html).toContain(`background:${theme.tokens.colors.background}`);
      expect(result.html).not.toMatch(/<(?:script|style|iframe|form)\b/i);
      expect(result.html).not.toMatch(/\sclass=/i);
    });
  });
});
