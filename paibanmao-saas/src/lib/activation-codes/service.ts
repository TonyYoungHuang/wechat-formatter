import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import type { PlanCode } from "@/lib/entitlements/plans";

type PaidPlanCode = Exclude<PlanCode, "free">;

type CreateActivationCodesInput = {
  planCode: PaidPlanCode;
  quantity: number;
  durationDays: number;
  maxRedemptions: number;
  batchName?: string;
  source?: string;
  note?: string;
  expiresAt?: Date;
  createdByUserId?: string;
};

type RedeemActivationCodeInput = {
  rawCode: string;
  workspaceId: string;
  userId: string;
};

export function normalizeActivationCode(rawCode: string) {
  return rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashActivationCode(rawCode: string) {
  return createHash("sha256").update(normalizeActivationCode(rawCode)).digest("hex");
}

function randomCodeSegment(length: number) {
  let value = "";

  while (value.length < length) {
    value += randomBytes(length).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  return value.slice(0, length);
}

function formatActivationCode(planCode: PaidPlanCode) {
  const planPrefix = planCode === "starter" ? "ST" : "PRO";
  const raw = randomCodeSegment(12);
  return `PBM-${planPrefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function codePreview(code: string) {
  const normalized = normalizeActivationCode(code);
  return {
    codePrefix: normalized.slice(0, 7),
    codeSuffix: normalized.slice(-4),
  };
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function createActivationCodes(input: CreateActivationCodesInput) {
  const codes: Array<{ id: string; code: string; codePrefix: string; codeSuffix: string; planCode: PaidPlanCode }> = [];

  for (let index = 0; index < input.quantity; index += 1) {
    let created = false;

    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      const code = formatActivationCode(input.planCode);
      const { codePrefix, codeSuffix } = codePreview(code);

      try {
        const record = await prisma.activationCode.create({
          data: {
            codeHash: hashActivationCode(code),
            codePrefix,
            codeSuffix,
            planCode: input.planCode,
            maxRedemptions: input.maxRedemptions,
            durationDays: input.durationDays,
            batchName: input.batchName || null,
            source: input.source || "ecommerce",
            note: input.note || null,
            expiresAt: input.expiresAt || null,
            createdByUserId: input.createdByUserId || null,
          },
        });

        codes.push({
          id: record.id,
          code,
          codePrefix: record.codePrefix,
          codeSuffix: record.codeSuffix,
          planCode: record.planCode as PaidPlanCode,
        });
        created = true;
      } catch (error) {
        if (attempt === 4) throw error;
      }
    }
  }

  return codes;
}

export async function redeemActivationCode(input: RedeemActivationCodeInput) {
  const codeHash = hashActivationCode(input.rawCode);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const activationCode = await tx.activationCode.findUnique({
      where: { codeHash },
    });

    if (!activationCode) {
      throw new Error("激活码不存在，请检查后重试。");
    }

    if (activationCode.status !== "active") {
      throw new Error("这个激活码已经停用或使用完了。");
    }

    if (activationCode.expiresAt && activationCode.expiresAt < now) {
      throw new Error("这个激活码已经过期。");
    }

    if (activationCode.redeemedCount >= activationCode.maxRedemptions) {
      throw new Error("这个激活码已经达到可使用次数上限。");
    }

    const existingRedemption = await tx.activationCodeRedemption.findUnique({
      where: {
        activationCodeId_workspaceId: {
          activationCodeId: activationCode.id,
          workspaceId: input.workspaceId,
        },
      },
    });

    if (existingRedemption) {
      throw new Error("这个激活码已经在当前账号使用过。");
    }

    const workspace = await tx.workspace.findUniqueOrThrow({
      where: { id: input.workspaceId },
      select: { id: true, planCode: true },
    });
    const subscriptionExpiresAt = activationCode.durationDays ? addDays(now, activationCode.durationDays) : null;

    const updatedCount = await tx.activationCode.updateMany({
      where: {
        id: activationCode.id,
        status: "active",
        redeemedCount: { lt: activationCode.maxRedemptions },
      },
      data: {
        redeemedCount: { increment: 1 },
      },
    });

    if (updatedCount.count !== 1) {
      throw new Error("这个激活码刚刚被使用完了，请换一个激活码。");
    }

    await tx.workspace.update({
      where: { id: workspace.id },
      data: { planCode: activationCode.planCode },
    });

    await tx.subscription.upsert({
      where: { workspaceId: workspace.id },
      create: {
        workspaceId: workspace.id,
        planCode: activationCode.planCode,
        status: "active",
        startsAt: now,
        expiresAt: subscriptionExpiresAt,
      },
      update: {
        planCode: activationCode.planCode,
        status: "active",
        startsAt: now,
        expiresAt: subscriptionExpiresAt,
      },
    });

    const redemption = await tx.activationCodeRedemption.create({
      data: {
        activationCodeId: activationCode.id,
        workspaceId: workspace.id,
        userId: input.userId,
        planCode: activationCode.planCode,
        beforePlanCode: workspace.planCode,
        subscriptionExpiresAt,
      },
    });

    if (activationCode.redeemedCount + 1 >= activationCode.maxRedemptions) {
      await tx.activationCode.update({
        where: { id: activationCode.id },
        data: { status: "used" },
      });
    }

    return {
      activationCode: {
        id: activationCode.id,
        planCode: activationCode.planCode,
        durationDays: activationCode.durationDays,
        expiresAt: activationCode.expiresAt,
      },
      redemption,
      subscriptionExpiresAt,
    };
  });
}
