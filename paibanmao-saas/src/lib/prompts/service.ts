import { prisma } from "@/lib/db/prisma";

type PromptContext = Record<string, string | number | boolean | null | undefined>;

export const defaultPromptTemplates: Record<string, string> = {
  five_entry_generation: [
    "选题：{{topic}}",
    "内容目标：{{goal}}",
    "账号名称：{{accountName}}",
    "领域：{{niche}}",
    "人设：{{persona}}",
    "目标读者：{{audience}}",
    "读者痛点：{{audiencePainPoints}}",
    "产品或服务：{{productOrService}}",
    "变现方式：{{monetizationMethods}}",
    "语气风格：{{tone}}",
    "常用 CTA：{{commonCta}}",
    "禁用表达：{{forbiddenWords}}",
    "参考样文：{{sampleText}}",
    "",
    "请生成五个微信入口内容：公众号长文、小绿书、搜一搜、问一问、朋友圈。",
    "要求：每个入口都要适配对应场景，不要简单复制同一段内容。",
    "小绿书入口需要在 metadata.imagePrompts 中给出图片提示词。",
    "搜一搜入口需要在 metadata.keywords 中给出关键词。",
    "不要承诺 guaranteed 流量、收入、排名、审核通过或高风险结果。",
  ].join("\n"),
  topic_generation: [
    "账号名称：{{accountName}}",
    "领域：{{niche}}",
    "目标读者：{{audience}}",
    "本周主题：{{theme}}",
    "变现目标：{{monetizationGoal}}",
    "避免方向：{{avoid}}",
    "",
    "请生成一组适合公众号、小绿书、搜一搜、问一问和朋友圈复用的微信内容选题。",
    "每个选题需要有推荐理由、适合入口和内容目标。",
  ].join("\n"),
  image_prompt_generation: [
    "主题：{{topic}}",
    "图片场景：{{scene}}",
    "视觉风格：{{style}}",
    "",
    "请生成适合微信图文、小绿书或公众号封面的中文图片提示词。",
  ].join("\n"),
};

function renderTemplate(content: string, context: PromptContext) {
  return content.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = context[key];
    return value === null || value === undefined || value === "" ? "未填写" : String(value);
  });
}

export async function getActivePromptTemplate(key: string, context: PromptContext = {}) {
  const template = await prisma.promptTemplate.findFirst({
    where: { key, active: true },
    orderBy: { version: "desc" },
  });

  const content = template?.content ?? defaultPromptTemplates[key] ?? "";

  return {
    id: template?.id ?? null,
    key,
    version: template?.version ?? 0,
    content,
    rendered: renderTemplate(content, context),
    source: template ? "database" : "default",
  };
}

export async function upsertPromptTemplate(input: {
  key: string;
  content: string;
  version?: number;
  active?: boolean;
}) {
  const version =
    input.version ??
    ((await prisma.promptTemplate.aggregate({
      where: { key: input.key },
      _max: { version: true },
    }))._max.version ?? 0) + 1;

  if (input.active !== false) {
    await prisma.promptTemplate.updateMany({
      where: { key: input.key, active: true },
      data: { active: false },
    });
  }

  return prisma.promptTemplate.upsert({
    where: { key_version: { key: input.key, version } },
    create: {
      key: input.key,
      version,
      content: input.content,
      active: input.active ?? true,
    },
    update: {
      content: input.content,
      active: input.active ?? true,
    },
  });
}
