import { NextResponse } from "next/server";

import { isSiteAdminEmail, requireCurrentUser } from "@/lib/auth/session";
import { createInvoiceRequestSchema } from "@/lib/billing/schemas";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    const current = await requireCurrentUser();
    const isSiteAdmin = isSiteAdminEmail(current.user.email);
    const invoices = await prisma.invoiceRequest.findMany({
      where: isSiteAdmin ? {} : { workspaceId: current.workspace.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            planCode: true,
          },
        },
        paymentOrder: {
          select: {
            id: true,
            planCode: true,
            provider: true,
            status: true,
            amountCents: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = createInvoiceRequestSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Invoice request payload is invalid.");
    }

    const order = await prisma.paymentOrder.findFirstOrThrow({
      where: {
        id: parsed.data.paymentOrderId,
        workspaceId: current.workspace.id,
      },
    });

    if (order.status !== "paid") {
      return errorResponse("Only paid orders can request an invoice.");
    }

    const existingInvoice = await prisma.invoiceRequest.findFirst({
      where: {
        workspaceId: current.workspace.id,
        paymentOrderId: order.id,
        status: { in: ["requested", "issued"] },
      },
      select: { id: true, status: true },
    });

    if (existingInvoice) {
      return errorResponse("This paid order already has an active invoice request.", 409);
    }

    const invoice = await prisma.invoiceRequest.create({
      data: {
        workspaceId: current.workspace.id,
        paymentOrderId: order.id,
        title: parsed.data.title,
        taxNumber: parsed.data.taxNumber,
        email: parsed.data.email,
        amountCents: order.amountCents,
      },
      include: {
        paymentOrder: {
          select: {
            id: true,
            planCode: true,
            provider: true,
            status: true,
            amountCents: true,
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
