import type { ArticleDocument } from "../types";

export const wechatPasteRegressionDocument: ArticleDocument = {
  version: 1,
  title: "排版猫微信公众号粘贴兼容测试",
  subtitle: "测试标题层级、全文背景、引用、清单、数据、对话、对比与行动区",
  author: "排版猫测试组",
  source: {
    type: "generated",
    fingerprint: "wechat-paste-regression-v1",
  },
  blocks: [
    {
      id: "lead-1",
      type: "lead",
      text: "这是一篇只用于微信公众号后台粘贴回归的样文。正文应保持透明背景，全文背景由最外层容器连续覆盖。",
    },
    { id: "h2-1", type: "heading", level: 2, text: "一、先确认四级文字层次" },
    {
      id: "p-1",
      type: "paragraph",
      text: "主标题、二级标题、三级标题和正文必须一眼能分辨。重点文字与链接也要保留。",
      segments: [
        { text: "主标题、二级标题、三级标题和正文必须一眼能分辨。" },
        { text: "重点文字", bold: true },
        { text: "与" },
        { text: "排版猫链接", href: "https://paibanmao.cn" },
        { text: "也要保留。" },
      ],
    },
    { id: "h3-1", type: "heading", level: 3, text: "（一）正文不应变成一排卡片" },
    {
      id: "p-2",
      type: "paragraph",
      text: "普通段落只负责阅读节奏，只有导语、引用、提示和行动区使用背景色。这样粘贴进微信后，文章不会只在第一行有背景，也不会通篇都是色块。",
    },
    {
      id: "quote-1",
      type: "quote",
      text: "预览和复制必须来自同一份最终 HTML，才能真正减少粘贴后的样式漂移。",
      source: "排版猫排版引擎规范",
    },
    { id: "h2-2", type: "heading", level: 2, text: "二、检查复杂内容块" },
    {
      id: "callout-1",
      type: "callout",
      tone: "important",
      title: "回归重点",
      text: "粘贴后不得出现 HTML 源码、横向溢出、标题同号或只剩纯文本。",
    },
    {
      id: "list-1",
      type: "list",
      ordered: false,
      items: [
        { text: "根背景覆盖整篇文章" },
        { text: "标题字号层次清楚" },
        { text: "列表、引用和链接可阅读" },
      ],
    },
    {
      id: "steps-1",
      type: "steps",
      title: "真实粘贴回归步骤",
      items: ["复制富文本 HTML", "粘贴到公众号编辑器", "检查样式和内容完整性", "不保存、不发布测试稿"],
    },
    { id: "stat-1", type: "stat", value: "10 套", label: "排版猫首批精品微信公众号模板" },
    {
      id: "compare-1",
      type: "compare",
      title: "粘贴前后对照",
      left: ["预览：标题清楚", "预览：背景连续", "预览：正文完整"],
      right: ["微信：标题清楚", "微信：背景连续", "微信：正文完整"],
    },
    {
      id: "dialogue-1",
      type: "dialogue",
      title: "用户最常问的两个问题",
      items: [
        { speaker: "用户", text: "我复制以后应该粘贴到哪里？" },
        { speaker: "排版猫", text: "粘贴到微信公众号图文编辑器的正文区域，再检查一次标题和图片即可。" },
      ],
    },
    { id: "divider-1", type: "divider" },
    {
      id: "cta-1",
      type: "cta",
      title: "测试完成后",
      text: "确认公众号后台中的内容完整、层级清晰、背景连续，再允许该主题进入模板库。",
    },
    {
      id: "byline-1",
      type: "byline",
      author: "排版猫测试组",
      text: "回归样文版本 v1，仅用于粘贴兼容验证，请勿发布。",
    },
  ],
};

export const premiumThemeSamples = [
  { themeId: "industry-report", title: "2026 微信内容经营趋势报告" },
  { themeId: "interview-dialogue", title: "和一个做了五年公众号的人聊了聊" },
  { themeId: "story-narrative", title: "我重新写公众号的第 30 天" },
  { themeId: "product-introduction", title: "排版猫如何把一个选题做成五个入口" },
  { themeId: "news-information", title: "微信内容生态本周更新速览" },
] as const;
