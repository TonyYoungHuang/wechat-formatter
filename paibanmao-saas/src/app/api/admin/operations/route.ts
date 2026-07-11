import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSiteAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

const manualCompSchema = z.object({
  action: z.literal("manual_comp"),
  workspaceId: z.string().min(1),
  planCode: z.enum(["free", "starter", "pro"]),
  note: z.string().trim().max(500).optional(),
});

const refundOrderSchema = z.object({
  action: z.literal("refund_order"),
  orderId: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

const riskUpdateSchema = z.object({
  action: z.literal("risk_update"),
  workspaceId: z.string().min(1),
  riskStatus: z.enum(["normal", "watch", "blocked"]),
  riskNote: z.string().trim().max(1000).nullable().optional(),
});

const operationActionSchema = z.discriminatedUnion("action", [manualCompSchema, refundOrderSchema, riskUpdateSchema]);

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function usageCount(since: Date) {
  const usage = await prisma.usageLog.aggregate({
    where: { key: "generation", createdAt: { gte: since } },
    _sum: { quantity: true },
  });
  return usage._sum.quantity ?? 0;
}

export async function GET(request: Request) {
  try {
    await requireSiteAdmin();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() || "";
    const whereSearch = query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            {
              members: {
                some: {
                  user: {
                    email: { contains: query, mode: "insensitive" as const },
                  },
                },
              },
            },
          ],
        }
      : {};

    const [users, workspaces, orders, dailyUsage, weeklyUsage, monthlyUsage, orderStatus, providerStatus, failedJobs, failedCallbacks, highUsage] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          memberships: {
            include: { workspace: true },
          },
          sessions: {
            where: { revokedAt: null, expiresAt: { gt: new Date() } },
            select: { id: true, createdAt: true, expiresAt: true },
          },
        },
      }),
      prisma.workspace.findMany({
        where: whereSearch,
        orderBy: [{ riskStatus: "desc" }, { updatedAt: "desc" }],
        take: 30,
        include: {
          members: { include: { user: { select: { id: true, email: true, name: true } } } },
          subscriptions: { orderBy: { updatedAt: "desc" }, take: 1 },
          _count: {
            select: {
              accountProfiles: true,
              projects: true,
              paymentOrders: true,
              usageLogs: true,
            },
          },
        },
      }),
      prisma.paymentOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              planCode: true,
              riskStatus: true,
              members: {
                take: 3,
                select: {
                  user: { select: { email: true, name: true } },
                },
              },
            },
          },
          callbacks: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      usageCount(daysAgo(1)),
      usageCount(daysAgo(7)),
      usageCount(daysAgo(30)),
      prisma.paymentOrder.groupBy({
        by: ["status"],
        _count: { _all: true },
        _sum: { amountCents: true },
      }),
      prisma.paymentOrder.groupBy({
        by: ["provider"],
        _count: { _all: true },
        _sum: { amountCents: true },
      }),
      prisma.generationJob.findMany({
        where: { status: "failed" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.paymentCallback.findMany({
        where: { status: { in: ["failed", "rejected", "invalid_payload"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.usageLog.groupBy({
        by: ["workspaceId"],
        where: { key: "generation", createdAt: { gte: daysAgo(7) } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      users,
      workspaces,
      orders,
      usage: {
        generation: {
          daily: dailyUsage,
          weekly: weeklyUsage,
          monthly: monthlyUsage,
        },
      },
      revenue: {
        byStatus: orderStatus,
        byProvider: providerStatus,
      },
      diagnostics: {
        failedJobs,
        failedCallbacks,
        highUsage,
      },
    });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireSiteAdmin();
    const parsed = operationActionSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Admin operation payload is invalid.");
    }

    if (parsed.data.action === "manual_comp") {
      const action = parsed.data;
      const order = await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: action.workspaceId } });
        const paymentOrder = await tx.paymentOrder.create({
          data: {
            workspaceId: workspace.id,
            planCode: action.planCode,
            provider: "manual",
            amountCents: 0,
            status: "paid",
            paidAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            providerTradeNo: `MANUAL_${Date.now()}`,
          },
        });

        await tx.workspace.update({
          where: { id: workspace.id },
          data: { planCode: action.planCode },
        });
        await tx.subscription.upsert({
          where: { workspaceId: workspace.id },
          create: { workspaceId: workspace.id, planCode: action.planCode, status: "active" },
          update: { planCode: action.planCode, status: "active", startsAt: new Date(), expiresAt: null },
        });
        await tx.paymentCallback.create({
          data: {
            workspaceId: workspace.id,
            paymentOrderId: paymentOrder.id,
            provider: "manual",
            status: "manual_comp",
            rawBody: JSON.stringify({ adminEmail: current.user.email, note: action.note || null }),
            message: action.note || "Manual compensation activated by admin.",
          },
        });
        return paymentOrder;
      });

      return NextResponse.json({ order });
    }

    if (parsed.data.action === "refund_order") {
      const action = parsed.data;
      const order = await prisma.$transaction(async (tx) => {
        const paymentOrder = await tx.paymentOrder.findUniqueOrThrow({ where: { id: action.orderId } });
        const updated = await tx.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: { status: "refunded" },
        });
        await tx.paymentCallback.create({
          data: {
            workspaceId: paymentOrder.workspaceId,
            paymentOrderId: paymentOrder.id,
            provider: paymentOrder.provider,
            status: "manual_refund",
            rawBody: JSON.stringify({ adminEmail: current.user.email, note: action.note || null }),
            message: action.note || "Manual refund marker created by admin.",
          },
        });
        return updated;
      });

      return NextResponse.json({ order });
    }

    const action = parsed.data;
    const workspace = await prisma.workspace.update({
      where: { id: action.workspaceId },
      data: {
        riskStatus: action.riskStatus,
        riskNote: action.riskNote,
        riskFlaggedAt: action.riskStatus === "normal" ? null : new Date(),
      },
    });

    return NextResponse.json({ workspace });
  } catch (error) {
    return mapApiError(error);
  }
}
