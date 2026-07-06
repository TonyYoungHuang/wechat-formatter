import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { getAiProviderCandidates } from "@/lib/ai/provider";

export const accountProfileDraftSchema = z.object({
  name: z.string().min(1).max(40),
  type: z.enum(["wechat_official", "green_note", "question_host", "personal_ip", "local_business"]),
  niche: z.string().min(1).max(80),
  persona: z.string().min(1).max(500),
  audience: z.string().min(1).max(300),
  audiencePainPoints: z.string().min(1).max(500),
  productOrService: z.string().max(500),
  monetizationMethods: z.array(z.string().min(1).max(40)).min(1).max(8),
  tone: z.string().min(1).max(200),
  commonCta: z.string().max(300),
  forbiddenWords: z.array(z.string().min(1).max(40)).min(1).max(40),
  sampleText: z.string().max(3000),
});

export type AccountProfileDraft = z.infer<typeof accountProfileDraftSchema>;

function inferType(idea: string): AccountProfileDraft["type"] {
  if (/问一问|答疑|问答/.test(idea)) return "question_host";
  if (/小绿书|图文|封面/.test(idea)) return "green_note";
  if (/本地|门店|同城|实体|商家/.test(idea)) return "local_business";
  if (/个人IP|个人 IP|主理人|博主/.test(idea)) return "personal_ip";
  return "wechat_official";
}

function compactIdea(idea: string) {
  return idea.replace(/\s+/g, " ").trim();
}

export function buildFallbackAccountProfileDraft(idea: string): AccountProfileDraft {
  const compact = compactIdea(idea);
  const core = compact.slice(0, 28) || "我的公众号";

  return {
    name: core.endsWith("公众号") ? core : `${core}的公众号`,
    type: inferType(compact),
    niche: compact.slice(0, 60) || "微信内容副业",
    persona: `一个围绕「${core}」持续输出的微信内容创作者，表达真实、具体，愿意把自己的观察和方法拆成普通人能执行的小步骤。`,
    audience: `对「${core}」感兴趣，希望通过公众号、小绿书、搜一搜、问一问和朋友圈获得具体经验的微信读者`,
    audiencePainPoints: "不知道从哪里开始、信息太碎片、看了很多内容但缺少可执行步骤，也担心内容不够可信或不够像自己。",
    productOrService: "资料包、咨询、课程、社群或本地服务",
    monetizationMethods: ["资料包", "咨询", "课程"],
    tone: "自然、具体、有陪伴感。少用夸张承诺，多讲真实判断、边界和下一步动作。",
    commonCta: "如果你也在关注这个方向，可以先收藏这篇，后面我会继续把方法拆得更细。",
    forbiddenWords: ["稳赚", "暴富", "唯一", "保证", "官方背书"],
    sampleText: "",
  };
}

export async function generateAccountProfileDraftWithAi(input: { idea: string }) {
  const fallback = buildFallbackAccountProfileDraft(input.idea);
  const candidates = (await getAiProviderCandidates("profile")).filter((config) => config.baseUrl && config.apiKey && config.model);

  if (!candidates.length) {
    return {
      profile: fallback,
      provider: "fallback",
      model: "local-rules",
      fallback: true,
      aiError: "AI provider is not configured.",
    };
  }

  const prompt = [
    `用户的一句话账号想法: ${input.idea}`,
    "",
    "请把它扩展成一个适合排版猫 SaaS 使用的微信账号档案。",
    "这个档案后续会直接影响公众号、小绿书、搜一搜、问一问和朋友圈五入口生成质量。",
    "",
    "生成要求:",
    "1. 像微信私域/公众号矩阵主理人做账号定位，不要写空泛品牌口号。",
    "2. 账号名称要短，像真实创作者会用的名称，不要机械写“某某领域专家”。",
    "3. niche 要明确到内容领域，不要只写“知识分享”“个人成长”。",
    "4. persona 要说明这个账号以什么身份说话、表达边界是什么。",
    "5. audience 和 audiencePainPoints 要具体到真实读者处境。",
    "6. productOrService 和 monetizationMethods 要克制可信，可以留有余地，不要承诺暴利。",
    "7. tone 要方便后续模型模仿，比如自然、直接、带一点经验感、少说大词。",
    "8. commonCta 要像微信里自然引导，不要强卖、不要夸张导流。",
    "9. forbiddenWords 要包含高风险承诺、夸大收益、平台背书类表达。",
    "10. sampleText 如果用户没有提供原文，就返回空字符串。",
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
        schema: accountProfileDraftSchema,
        system: [
          "你是排版猫的微信账号定位顾问。",
          "你的工作是帮助中国大陆小公众号创作者、副业个体和私域主理人建立可用于 AI 生成的账号档案。",
          "输出要具体、可信、可执行，避免 AI 味、营销腔和夸大承诺。",
        ].join("\n"),
        prompt,
        temperature: 0.55,
      });

      return {
        profile: result.object,
        provider: config.name,
        model: config.model,
        fallback: false,
        aiError: null,
      };
    } catch (error) {
      errors.push(`${config.name}/${config.model}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    profile: fallback,
    provider: "fallback",
    model: "local-rules",
    fallback: true,
    aiError: errors.join("; "),
  };
}
