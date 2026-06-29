import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/session";
import { createPaymentCheckout } from "@/lib/billing/gateways";
import { expirePendingPaymentOrders, getPlanPriceCents } from "@/lib/billing/orders";
import { createPaymentOrderSchema } from "@/lib/billing/schemas";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    const current = await requireCurrentUser();
    await expirePendingPaymentOrders(current.workspace.id);

    const orders = await prisma.paymentOrder.findMany({
      where: { workspaceId: current.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        callbacks: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            status: true,
            eventType: true,
            providerTradeNo: true,
            message: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    await expirePendingPaymentOrders(current.workspace.id);

    const parsed = createPaymentOrderSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Plan and payment provider are required.");
    }

    const amountCents = await getPlanPriceCents(parsed.data.planCode);

    if (amountCents <= 0) {
      return errorResponse("This paid plan price is not configured. Set a positive price before creating a payment order.", 409);
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const order = await prisma.paymentOrder.create({
      data: {
        workspaceId: current.workspace.id,
        planCode: parsed.data.planCode,
        provider: parsed.data.provider,
        amountCents,
        expiresAt,
      },
    });

    const checkout = await createPaymentCheckout({
      orderId: order.id,
      provider: parsed.data.provider,
      amountCents,
      expiresAt,
      description: `排版猫 ${parsed.data.planCode} 会员`,
    });
    const updated = await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { checkout },
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    return mapApiError(error);
  }
}
