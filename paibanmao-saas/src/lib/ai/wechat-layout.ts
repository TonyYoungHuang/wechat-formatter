import { generateJsonWithChat } from "@/lib/ai/chat-json";
import { getAiProviderCandidates } from "@/lib/ai/provider";
import {
  aiArticleStructureSchema,
  articleBlockText,
  createArticleDocumentFromText,
  createBlockId,
  getWechatTheme,
  normalizeComparableText,
  renderWechatDocument,
  resolveWechatThemeId,
  type ArticleBlock,
  type ArticleDocument,
  type WechatThemeInput,
} from "@/lib/wechat-layout";

export type WechatLayoutTemplate = WechatThemeInput;

type WechatLayoutInput = {
  title?: string;
  content: string;
  template: WechatLayoutTemplate;
};

function buildOutput(
  document: ArticleDocument,
  themeInput: WechatThemeInput,
  details: {
    notes: string[];
    provider: string;
    model: string;
    tokenInput: number;
    tokenOutput: number;
    aiError?: string | null;
  },
) {
  const rendered = renderWechatDocument(document, themeInput);
  return {
    title: document.title,
    document,
    html: rendered.html,
    text: rendered.text,
    themeId: rendered.themeId,
    themeVersion: rendered.themeVersion,
    audit: rendered.audit,
    notes: details.notes,
    provider: details.provider,
    model: details.model,
    tokenInput: details.tokenInput,
    tokenOutput: details.tokenOutput,
    aiError: details.aiError ?? null,
  };
}

export function buildFallbackWechatLayout(input: WechatLayoutInput) {
  const themeId = resolveWechatThemeId(input.template);
  const document = createArticleDocumentFromText(input.content, {
    title: input.title,
    themeId,
    sourceType: "generated",
  });
  return buildOutput(document, themeId, {
    notes: ["已用本地结构引擎识别标题、正文、引用和列表", "已应用微信行内样式和兼容检查", "原文内容没有交给排版引擎改写"],
    provider: "fallback",
    model: "paibanmao-layout-engine-v1",
    tokenInput: 0,
    tokenOutput: 0,
  });
}

function buildArticleDocumentFromAi(
  output: typeof aiArticleStructureSchema._output,
  input: WechatLayoutInput,
): ArticleDocument {
  const blocks = output.blocks.map((block, index): ArticleBlock => {
    const id = createBlockId(index, block.type);
    switch (block.type) {
      case "lead":
      case "paragraph":
        return { id, type: block.type, text: block.text };
      case "heading":
        return { id, type: "heading", level: block.level, text: block.text };
      case "quote":
        return { id, type: "quote", text: block.text, source: block.source };
      case "callout":
        return { id, type: "callout", tone: block.tone, title: block.title, text: block.text };
      case "list":
        return { id, type: "list", ordered: block.ordered, items: block.items.map((text) => ({ text })) };
      case "steps":
        return { id, type: "steps", title: block.title, items: block.items };
      case "compare":
        return { id, type: "compare", title: block.title, left: block.left, right: block.right };
      case "dialogue":
        return { id, type: "dialogue", title: block.title, items: block.items };
      case "stat":
        return { id, type: "stat", value: block.value, label: block.label };
      case "cta":
        return { id, type: "cta", title: block.title, text: block.text };
      case "divider":
        return { id, type: "divider" };
      case "byline":
        return { id, type: "byline", author: block.author, text: block.text };
    }
  });

  return {
    version: 1,
    title: output.title || input.title || "公众号文章",
    blocks,
    source: {
      type: "generated",
      fingerprint: createArticleDocumentFromText(input.content, { title: input.title }).source.fingerprint,
    },
  };
}

function shingleCoverage(source: string, candidate: string) {
  const normalizedSource = normalizeComparableText(source);
  const normalizedCandidate = normalizeComparableText(candidate);
  if (!normalizedSource) return 1;
  if (normalizedSource.length < 4) return normalizedCandidate.includes(normalizedSource) ? 1 : 0;

  const shingles = new Set<string>();
  for (let index = 0; index < normalizedSource.length - 1; index += 1) {
    shingles.add(normalizedSource.slice(index, index + 2));
  }
  let matches = 0;
  shingles.forEach((shingle) => {
    if (normalizedCandidate.includes(shingle)) matches += 1;
  });
  return matches / Math.max(shingles.size, 1);
}

function assertAiPreservedContent(input: WechatLayoutInput, document: ArticleDocument) {
  let source = normalizeComparableText(input.content);
  const normalizedTitle = normalizeComparableText(input.title || "");
  if (normalizedTitle && source.startsWith(normalizedTitle)) {
    source = source.slice(normalizedTitle.length);
  }
  const candidateText = document.blocks.map(articleBlockText).join("\n");
  const candidate = normalizeComparableText(candidateText);
  const lengthRatio = candidate.length / Math.max(source.length, 1);
  const coverage = shingleCoverage(source, candidate);

  if (lengthRatio < 0.72 || lengthRatio > 1.28 || coverage < 0.68) {
    throw new Error(`AI structure changed too much content (coverage ${coverage.toFixed(2)}, length ${lengthRatio.toFixed(2)}).`);
  }
}

export async function generateWechatLayoutWithAi(input: WechatLayoutInput) {
  const fallback = buildFallbackWechatLayout(input);
  const candidates = (await getAiProviderCandidates("layout")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    return { ...fallback, aiError: "AI provider is not configured." };
  }

  const selectedTheme = getWechatTheme(input.template);
  const prompt = [
    `用户选择的排版主题：${selectedTheme.name}`,
    `文章标题：${input.title || "请从原文识别"}`,
    "",
    "原文：",
    "-----",
    input.content.slice(0, 30000),
    "-----",
    "",
    "请只分析结构，不要改写原文。返回字段：title、recommendedThemeId、blocks、notes。",
    "blocks 可使用：lead、heading(level 2/3)、paragraph、quote、callout、list、steps、compare、dialogue、stat、cta、divider、byline。",
    "每个正文文字必须来自原文，保持原有顺序；只允许去掉 Markdown 标记、修复空行和把枚举拆成数组。",
    "不要补充新观点、数据、案例、收益、人物、产品承诺或营销话术。",
    "全文只能有一个主标题，主标题放 title，不要再放进 blocks。",
    "大段落用 level 2，小段落用 level 3；不要把每个短句都识别成标题。",
    "导语最多一个；重点框每 600 字最多两个；CTA 只有原文确实包含行动引导时才能使用。",
    "普通正文使用 paragraph，不要为了好看滥用 callout、quote、stat 或 divider。",
    "行业报告主题：原文有数据、对比和来源时优先识别 stat、compare、byline。",
    "访谈对话主题：原文有问答角色时优先识别 dialogue，金句可以识别为 quote。",
    "故事叙事主题：保留叙事节奏，少用 callout，章节转折使用 heading 或 divider。",
    "产品介绍主题：只在原文确有问题、方案、优势和行动引导时使用 compare、callout、cta。",
    "新闻资讯主题：导语承接核心事件，来源与时间放 byline，不得编造新闻要素。",
    "notes 用简短中文说明做了哪些结构处理。",
  ].join("\n");

  const errors: string[] = [];

  for (const config of candidates) {
    try {
      const result = await generateJsonWithChat({
        config,
        schema: aiArticleStructureSchema,
        system: [
          "你是排版猫的微信公众号结构主编。",
          "你的工作是识别文章结构和信息类型，不是改写文章，也不是生成 HTML。",
          "你必须尽量完整保留用户原文，让后续确定性排版引擎负责视觉样式。",
        ].join("\n"),
        prompt,
        temperature: 0.15,
        maxTokens: 7000,
        timeoutMs: Number(process.env.WECHAT_LAYOUT_AI_REQUEST_TIMEOUT_MS || 25000),
      });
      const document = buildArticleDocumentFromAi(result.object, input);
      assertAiPreservedContent(input, document);

      return buildOutput(document, selectedTheme.id, {
        notes: result.object.notes,
        provider: config.name,
        model: config.model,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
      });
    } catch (error) {
      errors.push(`${config.name}/${config.model}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    ...fallback,
    aiError: errors.join("; "),
  };
}
