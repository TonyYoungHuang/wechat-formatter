export const WECHAT_THEME_IDS = [
  "classic-green",
  "clean-reading",
  "deep-column",
  "tutorial-list",
  "private-conversion",
  "industry-report",
  "interview-dialogue",
  "story-narrative",
  "product-introduction",
  "news-information",
] as const;

export type WechatThemeId = (typeof WECHAT_THEME_IDS)[number];

export const LEGACY_WECHAT_TEMPLATE_IDS = ["clean", "deep", "private", "checklist", "editorial"] as const;

export type LegacyWechatTemplateId = (typeof LEGACY_WECHAT_TEMPLATE_IDS)[number];
export type WechatThemeInput = WechatThemeId | LegacyWechatTemplateId;

export type ArticleSourceType = "plain" | "markdown" | "tiptap" | "generated";

export type InlineSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};

type BaseBlock = {
  id: string;
};

type TextBlock = BaseBlock & {
  text: string;
  segments?: InlineSegment[];
};

export type ArticleBlock =
  | (TextBlock & { type: "lead" })
  | (TextBlock & { type: "heading"; level: 2 | 3 })
  | (TextBlock & { type: "paragraph" })
  | (TextBlock & { type: "quote"; source?: string })
  | (TextBlock & { type: "callout"; tone: "info" | "tip" | "important" | "warning"; title?: string })
  | (BaseBlock & { type: "list"; ordered: boolean; items: Array<{ text: string; segments?: InlineSegment[] }> })
  | (BaseBlock & { type: "steps"; title?: string; items: string[] })
  | (BaseBlock & { type: "compare"; title?: string; left: string[]; right: string[] })
  | (BaseBlock & { type: "dialogue"; title?: string; items: Array<{ speaker: string; text: string }> })
  | (BaseBlock & { type: "stat"; value: string; label: string })
  | (BaseBlock & { type: "image"; src: string; alt?: string; caption?: string })
  | (BaseBlock & { type: "imageGroup"; images: Array<{ src: string; alt?: string; caption?: string }> })
  | (TextBlock & { type: "cta"; title?: string })
  | (BaseBlock & { type: "divider" })
  | (TextBlock & { type: "byline"; author?: string });

export type ArticleDocument = {
  version: 1;
  title: string;
  subtitle?: string;
  author?: string;
  blocks: ArticleBlock[];
  source: {
    type: ArticleSourceType;
    fingerprint: string;
  };
};

export type WechatThemeStyles = {
  root: string;
  titleWrap: string;
  titleText: string;
  subtitle: string;
  h2Wrap: string;
  h2Text: string;
  h3Wrap: string;
  h3Text: string;
  paragraph: string;
  leadWrap: string;
  leadText: string;
  quoteWrap: string;
  quoteText: string;
  quoteSource: string;
  calloutWrap: string;
  calloutTitle: string;
  calloutText: string;
  listWrap: string;
  listRow: string;
  listBullet: string;
  listText: string;
  stepRow: string;
  stepNumber: string;
  stepText: string;
  compareWrap: string;
  compareColumn: string;
  dialogueWrap: string;
  dialogueSpeaker: string;
  dialogueText: string;
  statWrap: string;
  statValue: string;
  statLabel: string;
  image: string;
  imageCaption: string;
  ctaWrap: string;
  ctaTitle: string;
  ctaText: string;
  divider: string;
  bylineWrap: string;
  bylineAuthor: string;
  bylineText: string;
  strong: string;
  emphasis: string;
  link: string;
};

export type WechatTheme = {
  id: WechatThemeId;
  version: number;
  name: string;
  description: string;
  category: "general" | "opinion" | "tutorial" | "private" | "report" | "interview" | "story" | "product" | "news";
  recommendedFor: string[];
  tokens: {
    colors: {
      background: string;
      text: string;
      muted: string;
      accent: string;
      accentSoft: string;
    };
    typography: {
      titleSize: number;
      h2Size: number;
      h3Size: number;
      bodySize: number;
      bodyLineHeight: number;
    };
  };
  styles: WechatThemeStyles;
};

export type LayoutAuditIssue = {
  code: string;
  level: "error" | "warning" | "info";
  message: string;
};

export type LayoutAuditReport = {
  passed: boolean;
  issues: LayoutAuditIssue[];
};

export type WechatRenderResult = {
  html: string;
  text: string;
  themeId: WechatThemeId;
  themeVersion: number;
  fingerprint: string;
  audit: LayoutAuditReport;
};
