import { prisma } from "@/lib/db/prisma";
import { getDefaultPlan } from "@/lib/entitlements/plans";

export async function assertCanCreateAccountProfile(workspaceId: string, planCode: string) {
  const plan = getDefaultPlan(planCode === "starter" || planCode === "pro" ? planCode : "free");
  const count = await prisma.accountProfile.count({ where: { workspaceId } });

  if (count >= plan.accountProfileLimit) {
    throw new Error(`当前套餐最多支持 ${plan.accountProfileLimit} 个账号档案。`);
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

