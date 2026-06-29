import { prisma } from "@/lib/db/prisma";
import { getPlanConfig } from "@/lib/entitlements/service";

export function createStarterAccountProfileData(name: string) {
  return {
    name: `${name}的公众号`,
    type: "wechat_official" as const,
    niche: "微信内容副业",
    persona: "一个正在探索微信内容增长的个人创作者，表达真实、具体、愿意分享过程。",
    audience: "想用公众号、小绿书、搜一搜、问一问和朋友圈做副业的普通创作者",
    audiencePainPoints: "不知道写什么、内容无法复用、发布前担心标题和表达不稳、缺少持续输出节奏。",
    productOrService: "资料包、咨询、课程或本地服务",
    monetizationMethods: ["资料包", "咨询", "课程"],
    tone: "自然、直接、有陪伴感，少用夸张承诺，多给具体步骤。",
    commonCta: "如果你也想把一个选题拆成微信五个入口，可以先保存这篇，再按自己的账号定位改写。",
    forbiddenWords: ["稳赚", "暴富", "唯一", "保证"],
    sampleText: "",
    isDefault: true,
  };
}

export async function assertCanCreateAccountProfile(workspaceId: string, planCode: string) {
  const plan = await getPlanConfig(planCode === "starter" || planCode === "pro" ? planCode : "free");
  const count = await prisma.accountProfile.count({ where: { workspaceId } });

  if (count >= plan.accountProfileLimit) {
    throw new Error(`Current plan allows ${plan.accountProfileLimit} account profiles.`);
  }
}

export async function normalizeDefaultProfile(workspaceId: string, selectedId: string) {
  await prisma.accountProfile.updateMany({
    where: { workspaceId, id: { not: selectedId } },
    data: { isDefault: false },
  });

  await prisma.accountProfile.update({
    where: { id: selectedId },
    data: { isDefault: true },
  });
}
