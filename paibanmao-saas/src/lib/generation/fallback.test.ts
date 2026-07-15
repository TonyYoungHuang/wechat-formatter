import { describe, expect, it } from "vitest";

import { buildFallbackFiveEntry } from "./fallback";

const accountProfile = {
  name: "排版猫测试号",
  niche: "公众号创作",
  persona: "克制的实操者",
  audience: "刚开始做公众号的普通人",
  productOrService: "公众号工作台",
  commonCta: "先保存，再按自己的账号改一遍。",
  tone: "自然、直接",
};

describe("buildFallbackFiveEntry", () => {
  it("keeps source-specific points when AI generation is unavailable", () => {
    const variants = buildFallbackFiveEntry({
      topic: "为什么很多人迟迟不敢发布",
      goal: "trust",
      accountProfile,
      inputMode: "material",
      adaptationLabel: "原创发挥",
      sourceInstructions: "保留三个动作，不虚构经历。",
      sourceText:
        "很多人不是没有表达能力，而是把每一次发布都当成一次考试。真正能建立信任的并不是信息最多，而是持续提供真实判断。建议先记录让自己停顿的那句话，再写下它与自己经历的冲突，最后把感受变成能帮助读者做决定的内容。",
    });

    const article = variants.find((variant) => variant.entry === "wechat_article");
    expect(article?.body).toContain("先把素材里的关键判断拎出来");
    expect(article?.body).toContain("持续提供真实判断");
    expect(article?.body).toContain("不虚构经历");
  });

  it("keeps the original topic-only fallback when no source is supplied", () => {
    const variants = buildFallbackFiveEntry({
      topic: "普通人如何开始做公众号",
      goal: "growth",
      accountProfile,
      inputMode: "topic",
    });

    const article = variants.find((variant) => variant.entry === "wechat_article");
    expect(article?.body).not.toContain("先把素材里的关键判断拎出来");
    expect(article?.body).toContain("普通人如何开始做公众号");
  });
});
