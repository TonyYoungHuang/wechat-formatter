import type { LegacyWechatTemplateId, WechatTheme, WechatThemeId, WechatThemeInput, WechatThemeStyles } from "../types";
import { createAdvancedThemes } from "./advanced";

export const sharedStyles: WechatThemeStyles = {
  root: "display:block;width:100%;box-sizing:border-box;padding:22px 18px;background:#ffffff;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;",
  titleWrap: "display:block;margin:0 0 24px;padding:0 0 14px;border-bottom:2px solid #059669;text-align:left;",
  titleText: "display:block;color:#0f172a;font-size:24px;line-height:1.45;font-weight:800;letter-spacing:0;",
  subtitle: "display:block;margin:-12px 0 22px;color:#64748b;font-size:14px;line-height:1.7;text-align:left;",
  h2Wrap: "display:block;margin:32px 0 16px;padding:8px 12px;border-left:4px solid #059669;background:#ecfdf5;",
  h2Text: "display:block;color:#064e3b;font-size:19px;line-height:1.55;font-weight:750;letter-spacing:0;",
  h3Wrap: "display:block;margin:24px 0 12px;padding:0 0 6px;border-bottom:1px solid #a7f3d0;",
  h3Text: "display:block;color:#115e59;font-size:17px;line-height:1.55;font-weight:700;letter-spacing:0;",
  paragraph: "display:block;margin:0 0 16px;padding:0;background:transparent;color:#1f2937;font-size:16px;line-height:1.9;letter-spacing:0;text-align:justify;word-break:break-word;",
  leadWrap: "display:block;margin:0 0 24px;padding:16px 18px;border-left:4px solid #34d399;background:#ecfdf5;",
  leadText: "display:block;margin:0;color:#064e3b;font-size:16px;line-height:1.9;letter-spacing:0;",
  quoteWrap: "display:block;margin:22px 0;padding:16px 18px;border-left:4px solid #6ee7b7;background:#f0fdfa;",
  quoteText: "display:block;margin:0;color:#334155;font-size:16px;line-height:1.85;font-style:normal;",
  quoteSource: "display:block;margin:10px 0 0;color:#64748b;font-size:13px;line-height:1.6;text-align:right;",
  calloutWrap: "display:block;margin:20px 0;padding:15px 16px;border:1px solid #a7f3d0;background:#f0fdf4;",
  calloutTitle: "display:block;margin:0 0 6px;color:#047857;font-size:15px;line-height:1.6;font-weight:700;",
  calloutText: "display:block;margin:0;color:#334155;font-size:15px;line-height:1.8;",
  listWrap: "display:block;margin:16px 0 20px;padding:14px 16px;background:#f8fafc;",
  listRow: "display:table;width:100%;margin:0 0 9px;table-layout:fixed;",
  listBullet: "display:table-cell;width:26px;color:#059669;font-size:14px;line-height:1.85;font-weight:700;vertical-align:top;",
  listText: "display:table-cell;color:#1f2937;font-size:16px;line-height:1.85;vertical-align:top;word-break:break-word;",
  stepRow: "display:table;width:100%;margin:0 0 12px;table-layout:fixed;",
  stepNumber: "display:table-cell;width:34px;height:26px;color:#ffffff;background:#059669;font-size:13px;line-height:26px;font-weight:700;text-align:center;vertical-align:top;",
  stepText: "display:table-cell;padding:0 0 0 12px;color:#1f2937;font-size:16px;line-height:1.8;vertical-align:top;",
  compareWrap: "display:table;width:100%;margin:20px 0;border-collapse:separate;border-spacing:8px;table-layout:fixed;",
  compareColumn: "display:table-cell;width:50%;padding:14px;background:#f8fafc;color:#334155;font-size:14px;line-height:1.75;vertical-align:top;",
  dialogueWrap: "display:block;margin:20px 0;padding:16px;background:#f8fafc;",
  dialogueSpeaker: "display:block;margin:0 0 4px;color:#047857;font-size:13px;line-height:1.5;font-weight:700;",
  dialogueText: "display:block;margin:0 0 14px;padding:10px 12px;background:#ffffff;color:#334155;font-size:15px;line-height:1.75;",
  statWrap: "display:block;margin:22px 0;padding:22px 16px;background:#ecfdf5;text-align:center;",
  statValue: "display:block;margin:0;color:#047857;font-size:30px;line-height:1.3;font-weight:800;",
  statLabel: "display:block;margin:7px 0 0;color:#475569;font-size:14px;line-height:1.6;",
  image: "display:block;width:100%;max-width:100%;height:auto;margin:20px auto 8px;border-radius:4px;",
  imageCaption: "display:block;margin:0 0 20px;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;",
  ctaWrap: "display:block;margin:28px 0 8px;padding:18px;border:1px solid #6ee7b7;background:#ecfdf5;text-align:left;",
  ctaTitle: "display:block;margin:0 0 8px;color:#047857;font-size:17px;line-height:1.5;font-weight:750;",
  ctaText: "display:block;margin:0;color:#1f2937;font-size:15px;line-height:1.8;",
  divider: "display:block;width:34%;height:1px;margin:30px auto;border:0;background:#a7f3d0;",
  bylineWrap: "display:block;margin:28px 0 0;padding:16px;border-top:1px solid #d1fae5;background:#f8fafc;",
  bylineAuthor: "display:block;margin:0 0 6px;color:#047857;font-size:14px;line-height:1.6;font-weight:700;",
  bylineText: "display:block;margin:0;color:#64748b;font-size:14px;line-height:1.75;",
  strong: "color:#047857;font-weight:700;",
  emphasis: "color:#475569;font-style:italic;",
  link: "color:#576b95;text-decoration:none;word-break:break-all;",
};

const {
  industryReport,
  interviewDialogue,
  newsInformation,
  productIntroduction,
  storyNarrative,
} = createAdvancedThemes(sharedStyles);

const classicGreen: WechatTheme = {
  id: "classic-green",
  version: 1,
  name: "排版猫经典绿",
  description: "排版猫品牌默认样式，浅绿整页底色、清晰标题层级和克制重点框。",
  category: "general",
  recommendedFor: ["公众号常规长文", "知识分享", "副业经验"],
  tokens: {
    colors: { background: "#f7fffb", text: "#1f2937", muted: "#64748b", accent: "#059669", accentSoft: "#ecfdf5" },
    typography: { titleSize: 24, h2Size: 19, h3Size: 17, bodySize: 16, bodyLineHeight: 1.9 },
  },
  styles: {
    ...sharedStyles,
    root: sharedStyles.root.replace("background:#ffffff", "background:#f7fffb"),
    paragraph: sharedStyles.paragraph.replace("color:#1f2937", "color:#16352a"),
  },
};

const cleanReading: WechatTheme = {
  id: "clean-reading",
  version: 1,
  name: "清爽阅读",
  description: "白底留白型长文模板，正文不加色块，适合大多数公众号文章。",
  category: "general",
  recommendedFor: ["常规长文", "生活方式", "知识科普"],
  tokens: {
    colors: { background: "#ffffff", text: "#222222", muted: "#707070", accent: "#0f766e", accentSoft: "#f0fdfa" },
    typography: { titleSize: 25, h2Size: 20, h3Size: 17, bodySize: 16, bodyLineHeight: 1.9 },
  },
  styles: {
    ...sharedStyles,
    root: sharedStyles.root.replace("padding:22px 18px", "padding:24px 16px").replace("color:#1f2937", "color:#222222"),
    titleWrap: "display:block;margin:0 0 28px;padding:0;text-align:left;",
    titleText: "display:block;color:#111111;font-size:25px;line-height:1.42;font-weight:800;letter-spacing:0;",
    h2Wrap: "display:block;margin:34px 0 16px;padding:0 0 8px;border-bottom:2px solid #0f766e;background:transparent;",
    h2Text: "display:block;color:#111111;font-size:20px;line-height:1.5;font-weight:750;",
    h3Wrap: "display:block;margin:25px 0 12px;padding:0;background:transparent;",
    h3Text: "display:block;color:#0f766e;font-size:17px;line-height:1.55;font-weight:700;",
    paragraph: "display:block;margin:0 0 17px;padding:0;background:transparent;color:#222222;font-size:16px;line-height:1.9;text-align:justify;word-break:break-word;",
    divider: "display:block;width:26px;height:2px;margin:32px auto;border:0;background:#0f766e;",
    strong: "color:#111111;font-weight:750;border-bottom:2px solid #99f6e4;",
  },
};

const deepColumn: WechatTheme = {
  id: "deep-column",
  version: 1,
  name: "深度专栏",
  description: "强调导读、观点和引用，适合行业分析、评论和深度文章。",
  category: "opinion",
  recommendedFor: ["行业分析", "观点评论", "深度专栏"],
  tokens: {
    colors: { background: "#ffffff", text: "#172033", muted: "#667085", accent: "#1d4ed8", accentSoft: "#eff6ff" },
    typography: { titleSize: 26, h2Size: 20, h3Size: 17, bodySize: 16, bodyLineHeight: 1.88 },
  },
  styles: {
    ...sharedStyles,
    root: sharedStyles.root.replace("color:#1f2937", "color:#172033"),
    titleWrap: "display:block;margin:0 0 24px;padding:0 0 16px;border-bottom:1px solid #172033;text-align:left;",
    titleText: "display:block;color:#101828;font-family:Georgia,'Songti SC','SimSun',serif;font-size:26px;line-height:1.42;font-weight:750;",
    h2Wrap: "display:block;margin:36px 0 17px;padding:10px 0;border-top:1px solid #98a2b3;border-bottom:1px solid #98a2b3;background:transparent;text-align:center;",
    h2Text: "display:block;color:#101828;font-size:20px;line-height:1.5;font-weight:750;",
    h3Wrap: "display:block;margin:26px 0 12px;padding:0 0 0 10px;border-left:3px solid #1d4ed8;background:transparent;",
    h3Text: "display:block;color:#1e3a8a;font-size:17px;line-height:1.55;font-weight:700;",
    paragraph: "display:block;margin:0 0 18px;padding:0;background:transparent;color:#172033;font-size:16px;line-height:1.88;text-align:justify;word-break:break-word;",
    leadWrap: "display:block;margin:0 0 26px;padding:18px 20px;border-top:1px solid #bfdbfe;border-bottom:1px solid #bfdbfe;background:#f8fbff;",
    leadText: "display:block;margin:0;color:#344054;font-size:16px;line-height:1.9;",
    quoteWrap: "display:block;margin:24px 0;padding:18px 20px;background:#f8fafc;border-left:0;",
    quoteText: "display:block;margin:0;color:#344054;font-family:Georgia,'Songti SC','SimSun',serif;font-size:17px;line-height:1.85;font-style:italic;",
    strong: "color:#1d4ed8;font-weight:750;",
  },
};

const tutorialList: WechatTheme = {
  id: "tutorial-list",
  version: 1,
  name: "教程清单",
  description: "突出步骤、编号和注意事项，适合方法论、教程和避坑清单。",
  category: "tutorial",
  recommendedFor: ["教程", "操作步骤", "避坑清单"],
  tokens: {
    colors: { background: "#ffffff", text: "#253238", muted: "#607d8b", accent: "#d97706", accentSoft: "#fffbeb" },
    typography: { titleSize: 24, h2Size: 19, h3Size: 17, bodySize: 16, bodyLineHeight: 1.85 },
  },
  styles: {
    ...sharedStyles,
    titleWrap: "display:block;margin:0 0 24px;padding:14px 16px;border-left:6px solid #d97706;background:#fffbeb;",
    titleText: "display:block;color:#78350f;font-size:24px;line-height:1.45;font-weight:800;",
    h2Wrap: "display:block;margin:32px 0 16px;padding:8px 12px;background:#fef3c7;border-left:4px solid #d97706;",
    h2Text: "display:block;color:#78350f;font-size:19px;line-height:1.55;font-weight:750;",
    h3Wrap: "display:block;margin:24px 0 12px;padding:0 0 6px;border-bottom:1px dashed #f59e0b;",
    h3Text: "display:block;color:#92400e;font-size:17px;line-height:1.55;font-weight:700;",
    paragraph: "display:block;margin:0 0 16px;padding:0;background:transparent;color:#253238;font-size:16px;line-height:1.85;text-align:justify;word-break:break-word;",
    listWrap: "display:block;margin:18px 0 22px;padding:16px;background:#fffbeb;border:1px solid #fde68a;",
    listBullet: "display:table-cell;width:28px;color:#d97706;font-size:15px;line-height:1.8;font-weight:800;vertical-align:top;",
    stepNumber: "display:table-cell;width:32px;height:28px;color:#ffffff;background:#d97706;font-size:14px;line-height:28px;font-weight:800;text-align:center;vertical-align:top;border-radius:50%;",
    calloutWrap: "display:block;margin:20px 0;padding:15px 16px;border:1px solid #fbbf24;background:#fffbeb;",
    calloutTitle: "display:block;margin:0 0 6px;color:#92400e;font-size:15px;line-height:1.6;font-weight:750;",
    strong: "color:#b45309;font-weight:750;",
  },
};

const privateConversion: WechatTheme = {
  id: "private-conversion",
  version: 1,
  name: "私域转化",
  description: "以信任和行动为重点，适合咨询、服务介绍和社群承接。",
  category: "private",
  recommendedFor: ["私域内容", "咨询服务", "社群承接"],
  tokens: {
    colors: { background: "#fffdf8", text: "#302d2a", muted: "#78716c", accent: "#be123c", accentSoft: "#fff1f2" },
    typography: { titleSize: 24, h2Size: 19, h3Size: 17, bodySize: 16, bodyLineHeight: 1.88 },
  },
  styles: {
    ...sharedStyles,
    root: sharedStyles.root.replace("background:#ffffff", "background:#fffdf8").replace("color:#1f2937", "color:#302d2a"),
    titleWrap: "display:block;margin:0 0 24px;padding:0 0 14px;border-bottom:3px solid #be123c;",
    titleText: "display:block;color:#3f1d2a;font-size:24px;line-height:1.45;font-weight:800;",
    h2Wrap: "display:block;margin:32px 0 16px;padding:9px 12px;background:#fff1f2;border-left:4px solid #be123c;",
    h2Text: "display:block;color:#881337;font-size:19px;line-height:1.55;font-weight:750;",
    h3Wrap: "display:block;margin:24px 0 12px;padding:0 0 6px;border-bottom:1px solid #fecdd3;",
    h3Text: "display:block;color:#9f1239;font-size:17px;line-height:1.55;font-weight:700;",
    paragraph: "display:block;margin:0 0 17px;padding:0;background:transparent;color:#302d2a;font-size:16px;line-height:1.88;text-align:justify;word-break:break-word;",
    ctaWrap: "display:block;margin:30px 0 8px;padding:20px;border:2px solid #fb7185;background:#fff1f2;text-align:center;",
    ctaTitle: "display:block;margin:0 0 8px;color:#9f1239;font-size:18px;line-height:1.5;font-weight:800;",
    ctaText: "display:block;margin:0;color:#4c0519;font-size:15px;line-height:1.8;",
    quoteWrap: "display:block;margin:22px 0;padding:16px 18px;border-left:4px solid #fda4af;background:#fff7f7;",
    strong: "color:#be123c;font-weight:750;",
  },
};

export const wechatThemes: Record<WechatThemeId, WechatTheme> = {
  "classic-green": classicGreen,
  "clean-reading": cleanReading,
  "deep-column": deepColumn,
  "tutorial-list": tutorialList,
  "private-conversion": privateConversion,
  "industry-report": industryReport,
  "interview-dialogue": interviewDialogue,
  "story-narrative": storyNarrative,
  "product-introduction": productIntroduction,
  "news-information": newsInformation,
};

const legacyThemeMap: Record<LegacyWechatTemplateId, WechatThemeId> = {
  clean: "clean-reading",
  deep: "deep-column",
  private: "private-conversion",
  checklist: "tutorial-list",
  editorial: "classic-green",
};

export function resolveWechatThemeId(input?: WechatThemeInput | string | null): WechatThemeId {
  if (input && input in wechatThemes) return input as WechatThemeId;
  if (input && input in legacyThemeMap) return legacyThemeMap[input as LegacyWechatTemplateId];
  return "classic-green";
}

export function getWechatTheme(input?: WechatThemeInput | string | null) {
  return wechatThemes[resolveWechatThemeId(input)];
}

export const wechatThemeOptions = Object.values(wechatThemes).map((theme) => ({
  id: theme.id,
  label: theme.name,
  description: theme.description,
  category: theme.category,
  recommendedFor: theme.recommendedFor,
}));

export function lintWechatTheme(theme: WechatTheme) {
  const issues: string[] = [];
  const { titleSize, h2Size, h3Size, bodySize, bodyLineHeight } = theme.tokens.typography;
  if (!(titleSize > h2Size && h2Size > h3Size && h3Size >= bodySize)) issues.push("标题字号层级倒置");
  if (bodySize < 15 || bodySize > 17) issues.push("正文字号必须在 15-17px");
  if (bodyLineHeight < 1.7) issues.push("正文行高不能低于 1.7");
  if (titleSize > 28) issues.push("手机端主标题不能超过 28px");
  if (h2Size > 22) issues.push("手机端二级标题不能超过 22px");
  return issues;
}

Object.values(wechatThemes).forEach((theme) => {
  const issues = lintWechatTheme(theme);
  if (issues.length) throw new Error(`Invalid WeChat theme ${theme.id}: ${issues.join("; ")}`);
});
