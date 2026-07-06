import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { getAiProviderCandidates } from "@/lib/ai/provider";

const wechatLayoutOutputSchema = z.object({
  title: z.string().min(1).max(160),
  html: z.string().min(20).max(60000),
  notes: z.array(z.string().min(1).max(160)).min(1).max(8),
});

export type WechatLayoutTemplate = "clean" | "deep" | "private" | "checklist" | "editorial";

const templateLabels: Record<WechatLayoutTemplate, string> = {
  clean: "清爽长文",
  deep: "深度观点",
  private: "私域转化",
  checklist: "教程清单",
  editorial: "主编精排",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildFallbackWechatLayout(input: { title?: string; content: string; template: WechatLayoutTemplate }) {
  const blocks = input.content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const title = input.title?.trim() || blocks[0]?.replace(/^#+\s*/, "").slice(0, 80) || "公众号文章";
  const bodyBlocks = blocks[0] === title ? blocks.slice(1) : blocks;
  const html = [
    `<h1>${escapeHtml(title)}</h1>`,
    ...bodyBlocks.map((block, index) => {
      if (/^#+\s+/.test(block)) {
        return `<h2>${escapeHtml(block.replace(/^#+\s*/, ""))}</h2>`;
      }
      if (input.template === "checklist" && /[\n；;]/.test(block)) {
        const items = block
          .split(/\n|[；;]/)
          .map((item) => item.replace(/^[-*•\d.、\s]+/, "").trim())
          .filter(Boolean);
        if (items.length >= 2) {
          return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
        }
      }
      if (index === 0 && input.template === "deep") {
        return `<blockquote>${escapeHtml(block).replaceAll("\n", "<br />")}</blockquote>`;
      }
      return `<p>${escapeHtml(block).replaceAll("\n", "<br />")}</p>`;
    }),
  ].join("\n");

  return {
    title,
    html,
    notes: ["已使用本地规则排版", "未保存原文到额外位置", "复制 HTML 后可直接粘贴到公众号后台继续微调"],
    provider: "fallback",
    model: "local-rules",
    tokenInput: 0,
    tokenOutput: 0,
  };
}

export async function generateWechatLayoutWithAi(input: { title?: string; content: string; template: WechatLayoutTemplate }) {
  const fallback = buildFallbackWechatLayout(input);
  const candidates = (await getAiProviderCandidates("layout")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    return {
      ...fallback,
      aiError: "AI provider is not configured.",
    };
  }

  const prompt = [
    `排版模板: ${templateLabels[input.template]}`,
    `标题: ${input.title || "未填写"}`,
    "",
    "原文:",
    "-----",
    input.content.slice(0, 30000),
    "-----",
    "",
    "请把这篇公众号正文排成更精美、更适合微信后台粘贴的 HTML。",
    "",
    "排版要求:",
    "1. 只使用微信公众号常见可粘贴标签: h1、h2、h3、p、blockquote、ul、ol、li、strong、em、hr。",
    "2. 不要使用 script、iframe、form、style 标签，不要使用外链图片，不要插入真实平台 Logo。",
    "3. 保留原文核心意思，不要编造数据、案例、收入、截图、平台背书。",
    "4. 自动识别标题、导语、重点句、清单、引用、结尾行动区。",
    "5. 段落要短，适合手机阅读。重要句可以单独成段或加 strong。",
    "6. h2 小标题要像真实公众号编辑起的标题，有判断，不要全是“第一/第二/第三”。",
    "7. 如果模板是私域转化，结尾 CTA 要突出但克制；如果是教程清单，步骤要清楚；如果是深度观点，开头要有导读引用。",
    "8. html 必须是正文片段，不要输出完整 html/head/body。",
    "9. notes 写清楚你做了哪些排版处理，方便用户理解。",
  ].join("\n");

  const errors: string[] = [];

  for (const config of candidates) {
    try {
      const openai = createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      });

      const result = await generateObject({
        model: openai(config.model),
        schema: wechatLayoutOutputSchema,
        system: [
          "你是排版猫的微信公众号排版主编。",
          "你擅长把普通正文整理成微信后台可粘贴的精美 HTML。",
          "你的排版应该清爽、可信、移动端好读，不要廉价营销感，不要过度装饰。",
          "你只能输出安全的正文 HTML 片段和排版说明。",
        ].join("\n"),
        prompt,
        temperature: 0.35,
      });

      return {
        ...result.object,
        provider: config.name,
        model: config.model,
        tokenInput: result.usage.inputTokens ?? 0,
        tokenOutput: result.usage.outputTokens ?? 0,
        aiError: null,
      };
    } catch (error) {
      errors.push(`${config.name}/${config.model}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    ...fallback,
    aiError: errors.join("; "),
  };
}
