import { prisma } from "@/lib/db/prisma";
import { getPlanConfig } from "@/lib/entitlements/service";

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
