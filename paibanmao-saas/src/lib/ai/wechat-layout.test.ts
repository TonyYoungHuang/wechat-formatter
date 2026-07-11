import { describe, expect, it } from "vitest";

import { applyCompactLayoutPlan, buildCompactLayoutPrompt } from "./wechat-layout";
import { articleBlockText, createArticleDocumentFromText } from "../wechat-layout";

describe("compact Claude WeChat layout planning", () => {
  it("asks Claude for decisions without asking it to copy the article", () => {
    const document = createArticleDocumentFromText(
      "测试标题\n\n这是一段导语。\n\n一、先确定读者\n\n正文内容保持原样。",
      { themeId: "classic-green" },
    );

    const prompt = buildCompactLayoutPrompt(document);

    expect(prompt).toContain("[0|lead]");
    expect(prompt).toContain("[1|heading2]");
    expect(prompt.length).toBeLessThan(500);
  });

  it("applies only structural decisions and preserves every source word", () => {
    const document = createArticleDocumentFromText(
      "测试标题\n\n开头说明读者会得到什么。\n\n一个需要强调的判断\n\n欢迎留言告诉我你的问题。",
      { themeId: "clean-reading" },
    );
    const before = document.blocks.map(articleBlockText).join("");

    const result = applyCompactLayoutPlan(document, {
      decisions: [
        { index: 1, type: "callout", tone: "important" },
        { index: 2, type: "cta" },
      ],
      notes: [],
    });

    expect(result.blocks[1].type).toBe("callout");
    expect(result.blocks[2].type).toBe("cta");
    expect(result.blocks.map(articleBlockText).join("")).toBe(before);
  });

  it("rejects sentence-length headings and excess lead blocks", () => {
    const document = createArticleDocumentFromText(
      "测试标题\n\n第一段导语。\n\n这是一段完整的正文，它不应该因为模型判断就被错误改成标题。",
      { themeId: "classic-green" },
    );

    const result = applyCompactLayoutPlan(document, {
      decisions: [
        { index: 0, type: "lead" },
        { index: 1, type: "heading2" },
      ],
      notes: [],
    });

    expect(result.blocks.filter((block) => block.type === "lead")).toHaveLength(1);
    expect(result.blocks[1].type).toBe("paragraph");
  });
});
