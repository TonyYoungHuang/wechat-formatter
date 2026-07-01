import { prisma } from "@/lib/db/prisma";

export async function getAccountKnowledgeContext(accountProfileId: string) {
  const items = await prisma.accountKnowledgeItem.findMany({
    where: { accountProfileId, active: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  if (!items.length) {
    return "无";
  }

  return items
    .map((item, index) => {
      const tags = item.tags.length ? `标签: ${item.tags.join("、")}` : "标签: 无";
      return [
        `资料 ${index + 1}: ${item.title}`,
        `类型: ${item.sourceType}`,
        `原文字数: ${item.contentCharCount}`,
        tags,
      ].join("\n");
    })
    .join("\n\n");
}

export function appendKnowledgeContext(prompt: string, knowledgeContext: string) {
  if (!knowledgeContext || knowledgeContext === "无") {
    return prompt;
  }

  return [
    prompt,
    "",
    "账号知识库:",
    knowledgeContext,
    "",
    "使用方式: 这些是由客户原文和历史生成内容提取出的标签画像。优先吸收标签里的真实观点、产品细节、案例方向和表达习惯，但不要编造标签里没有的成绩、数据和经历。",
  ].join("\n");
}
