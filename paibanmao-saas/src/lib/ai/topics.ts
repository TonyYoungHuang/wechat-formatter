import { z } from "zod";

import { generateJsonWithChat } from "@/lib/ai/chat-json";
import { getAiProviderCandidates } from "@/lib/ai/provider";

type AccountProfileLike = {
  name: string;
  niche: string;
  persona: string;
  audience: string;
  audiencePainPoints: string;
  productOrService: string;
  monetizationMethods: string[];
  tone: string;
  commonCta: string;
  forbiddenWords: string[];
  sampleText?: string | null;
};

const contentGoalSchema = z.enum(["growth", "search", "conversion", "trust", "interaction"]);
const contentEntrySchema = z.enum(["wechat_article", "green_note", "search", "question", "moments"]);

const topicSuggestionSchema = z.object({
  title: z.string().min(2).max(160),
  reason: z.string().min(1).max(800),
  goals: z.array(contentGoalSchema).min(1).max(5),
  entries: z.array(contentEntrySchema).min(1).max(5),
});

const topicSuggestionsSchema = z.object({
  suggestions: z.array(topicSuggestionSchema).min(3).max(10),
});

export type AiTopicSuggestion = z.infer<typeof topicSuggestionSchema>;

export type AiTopicSuggestionsResult = {
  suggestions: AiTopicSuggestion[];
  provider: string;
  model: string;
  tokenInput: number;
  tokenOutput: number;
};

export async function generateTopicSuggestionsWithAi(input: {
  profile: AccountProfileLike;
  theme: string;
  monetizationGoal: string;
  avoid?: string;
  count: number;
  prompt?: string;
}): Promise<AiTopicSuggestionsResult> {
  const profile = input.profile;
  const prompt =
    input.prompt ??
    [
      `账号名称: ${profile.name}`,
      `领域: ${profile.niche}`,
      `人设: ${profile.persona}`,
      `目标读者: ${profile.audience}`,
      `读者痛点: ${profile.audiencePainPoints}`,
      `产品或服务: ${profile.productOrService || "未填写"}`,
      `变现方式: ${profile.monetizationMethods.join(", ") || "未填写"}`,
      `语气风格: ${profile.tone}`,
      `常用 CTA: ${profile.commonCta || "自然关注或私信引导"}`,
      `禁用表达: ${profile.forbiddenWords.join(", ") || "无"}`,
      `参考样文: ${profile.sampleText || "无"}`,
      `本次主题: ${input.theme}`,
      `变现目标: ${input.monetizationGoal}`,
      `避免方向: ${input.avoid || "无"}`,
      `生成数量: ${input.count}`,
    ].join("\n");

  const candidates = (await getAiProviderCandidates("topic")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    throw new Error("AI provider is not configured.");
  }

  const errors: string[] = [];

  for (const config of candidates) {
    try {
      const result = await generateJsonWithChat({
        config,
        schema: topicSuggestionsSchema,
        system: [
          "你是排版猫的微信内容选题策划助手。",
          "请为中国大陆微信副业创作者生成可执行、可复用、可转化的中文选题。",
          "选题要像真人创作者会在备忘录里写下来的题，而不是 AI 生成的栏目标题。",
          "优先写具体处境、具体矛盾和具体动作，例如“写了几篇没人看”“下班后只有 1 小时”“不知道朋友圈怎么转”。",
          "不要使用空泛大词，例如赋能、闭环、全方位、打造个人品牌、快速变现。",
          "每个选题都要标注适合的微信入口和内容目标，并能延展到公众号、小绿书、搜一搜、问一问和朋友圈。",
          "不要承诺保证涨粉、保证收入、保证排名或保证审核通过。",
          "避免洗稿、搬运、夸大收益、制造焦虑和诱导分享。",
        ].join("\n"),
        prompt,
        temperature: 0.7,
        maxTokens: 2600,
        timeoutMs: Number(process.env.TOPIC_AI_REQUEST_TIMEOUT_MS || 22000),
      });

      return {
        suggestions: result.object.suggestions.slice(0, input.count),
        provider: config.name,
        model: config.model,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      errors.push(`${config.name}/${config.model}: ${message}`);
    }
  }

  throw new Error(`AI topic generation failed for all providers: ${errors.join("; ")}`);
}
