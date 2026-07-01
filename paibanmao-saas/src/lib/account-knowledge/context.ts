import { prisma } from "@/lib/db/prisma";

function compactContent(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

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
        tags,
        `内容: ${compactContent(item.content, 900)}`,
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
    "使用方式: 优先吸收账号知识库里的真实观点、产品细节、案例和表达习惯，但不要生硬照抄；不要编造知识库里没有的成绩、数据和经历。",
  ].join("\n");
}
