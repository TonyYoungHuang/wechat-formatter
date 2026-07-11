import {
  generateJsonWithChat,
  getFriendlyAiErrorMessage,
  isFatalAiRequestError,
} from "./chat-json";
import { getAiProviderCandidates } from "./provider";
import {
  aiArticleLayoutPlanSchema,
  articleBlockText,
  createArticleDocumentFromText,
  createBlockId,
  getWechatTheme,
  renderWechatDocument,
  resolveWechatThemeId,
  type ArticleBlock,
  type ArticleDocument,
  type WechatThemeInput,
} from "../wechat-layout";

export type WechatLayoutTemplate = WechatThemeInput;

type WechatLayoutInput = {
  title?: string;
  content: string;
  template: WechatLayoutTemplate;
};

type LayoutPlan = typeof aiArticleLayoutPlanSchema._output;

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

function getPlanningType(block: ArticleBlock) {
  return block.type === "heading" ? `heading${block.level}` : block.type;
}

export function buildCompactLayoutPrompt(document: ArticleDocument, maxChars = 14000) {
  const lines: string[] = [];
  let usedChars = 0;

  document.blocks.forEach((block, index) => {
    if (["divider", "image", "imageGroup"].includes(block.type)) return;
    const text = articleBlockText(block).replace(/\s+/g, " ").trim().slice(0, 360);
    if (!text) return;
    const line = `[${index}|${getPlanningType(block)}] ${text}`;
    if (usedChars + line.length > maxChars) return;
    lines.push(line);
    usedChars += line.length + 1;
  });

  return lines.join("\n");
}

function isConvertibleTextBlock(block: ArticleBlock) {
  return ["lead", "heading", "paragraph", "quote", "callout", "cta", "byline"].includes(block.type);
}

function convertTextBlock(block: ArticleBlock, index: number, decision: LayoutPlan["decisions"][number]): ArticleBlock {
  if (!isConvertibleTextBlock(block)) return block;
  const text = articleBlockText(block).trim();
  if (!text) return block;

  switch (decision.type) {
    case "lead":
      return { id: createBlockId(index, "lead"), type: "lead", text };
    case "heading2":
    case "heading3":
      if (text.length > 80 || /[。！？!?；;]$/.test(text)) return block;
      return { id: createBlockId(index, "heading"), type: "heading", level: decision.type === "heading2" ? 2 : 3, text };
    case "paragraph":
      return { id: createBlockId(index, "paragraph"), type: "paragraph", text };
    case "quote":
      return { id: createBlockId(index, "quote"), type: "quote", text };
    case "callout":
      return { id: createBlockId(index, "callout"), type: "callout", tone: decision.tone || "important", text };
    case "cta":
      if (!/(关注|私信|留言|评论|咨询|扫码|添加微信|回复关键词|加入社群|领取|点击|转发)/.test(text)) return block;
      return { id: createBlockId(index, "cta"), type: "cta", title: "下一步", text };
  }
}

export function applyCompactLayoutPlan(document: ArticleDocument, plan: LayoutPlan) {
  const decisions = new Map(plan.decisions.map((decision) => [decision.index, decision]));
  const maxCallouts = Math.max(1, Math.ceil(document.blocks.map(articleBlockText).join("").length / 700));
  let leadUsed = false;
  let calloutsUsed = 0;

  const blocks = document.blocks.map((block, index) => {
    const decision = decisions.get(index);
    let next = decision ? convertTextBlock(block, index, decision) : block;

    if (next.type === "lead") {
      if (leadUsed) {
        next = { id: createBlockId(index, "paragraph"), type: "paragraph", text: articleBlockText(next) };
      }
      leadUsed = true;
    }

    if (next.type === "callout") {
      if (calloutsUsed >= maxCallouts) {
        next = { id: createBlockId(index, "paragraph"), type: "paragraph", text: articleBlockText(next) };
      } else {
        calloutsUsed += 1;
      }
    }

    return next;
  });

  return { ...document, blocks };
}

export async function generateWechatLayoutWithAi(input: WechatLayoutInput, options: { signal?: AbortSignal } = {}) {
  const fallback = buildFallbackWechatLayout(input);
  const candidates = (await getAiProviderCandidates("layout")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    return { ...fallback, aiError: "Claude 服务尚未配置，请联系管理员。本次不扣生成额度。" };
  }

  const selectedTheme = getWechatTheme(input.template);
  const baseDocument = fallback.document;
  const compactBlocks = buildCompactLayoutPrompt(
    baseDocument,
    Number(process.env.WECHAT_LAYOUT_AI_PROMPT_CHAR_LIMIT || 14000),
  );
  const prompt = [
    `排版主题：${selectedTheme.name}`,
    `文章标题：${baseDocument.title}`,
    "下面是本地引擎已切分的段落，格式为 [序号|当前类型] 段落预览：",
    compactBlocks,
    "",
    "只返回需要调整的段落，不要返回未变化的段落，更不要复述任何原文。",
    "可选类型：lead、heading2、heading3、paragraph、quote、callout、cta。callout 可附 tone：info、tip、important、warning。",
    "全文最多一个 lead；标题要克制，不要把完整句子当标题；普通正文保持 paragraph。",
    "只有原文明确包含行动引导时才用 cta；重点段才用 callout，避免通篇色块。",
    "列表、步骤、对话、数据和图片等本地已识别类型不要调整。",
    "返回 JSON：{\"decisions\":[{\"index\":2,\"type\":\"heading2\"}],\"notes\":[\"识别了章节层级\"]}",
  ].join("\n");

  let lastError: unknown;
  for (const config of candidates) {
    try {
      const result = await generateJsonWithChat({
        config,
        schema: aiArticleLayoutPlanSchema,
        system: "你是排版猫的微信公众号结构主编。只做段落分类，不改写、不摘要、不复述原文，只输出合法 JSON。",
        prompt,
        temperature: 0,
        maxTokens: Number(process.env.WECHAT_LAYOUT_AI_MAX_TOKENS || 1800),
        timeoutMs: Number(process.env.WECHAT_LAYOUT_AI_REQUEST_TIMEOUT_MS || 18000),
        signal: options.signal,
        autoCache: true,
      });
      const document = applyCompactLayoutPlan(baseDocument, result.object);
      const notes = result.object.notes.length
        ? result.object.notes
        : ["Claude 已完成段落层级判断", "原文由本地结构引擎完整保留"];

      return buildOutput(document, selectedTheme.id, {
        notes,
        provider: config.name,
        model: config.model,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
      });
    } catch (error) {
      lastError = error;
      if (options.signal?.aborted || isFatalAiRequestError(error)) break;
    }
  }

  return {
    ...fallback,
    aiError: getFriendlyAiErrorMessage(lastError),
  };
}
