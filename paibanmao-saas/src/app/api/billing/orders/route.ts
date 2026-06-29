import { requireCurrentUser } from "@/lib/auth/session";
import { buildPlaceholderCheckout, getPlanPriceCents } from "@/lib/billing/orders";
import { createPaymentOrderSchema } from "@/lib/billing/schemas";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = createPaymentOrderSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("请选择套餐和支付方式。");
    }

    const amountCents = getPlanPriceCents(parsed.data.planCode);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const order = await prisma.paymentOrder.create({
      data: {
        workspaceId: current.workspace.id,
        planCode: parsed.data.planCode,
        provider: parsed.data.provider,
        amountCents,
        expiresAt,
        checkout: buildPlaceholderCheckout("pending", parsed.data.provider),
      },
    });

    const checkout = buildPlaceholderCheckout(order.id, parsed.data.provider);
    const updated = await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { checkout },
    });

    return Response.json({ order: updated });
  } catch (error) {
    return mapApiError(error);
  }
}

