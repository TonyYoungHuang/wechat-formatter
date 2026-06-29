import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireSiteAdmin } from "@/lib/auth/session";
import { invoiceRequestPatchSchema } from "@/lib/billing/schemas";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireSiteAdmin();
    const { id } = await context.params;
    const parsed = invoiceRequestPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Invoice update payload is invalid.");
    }

    await prisma.invoiceRequest.findFirstOrThrow({
      where: { id },
      select: { id: true },
    });

    const data: Prisma.InvoiceRequestUpdateInput = {
      status: parsed.data.status,
      note: parsed.data.note,
    };

    if (parsed.data.issuedAt !== undefined) {
      data.issuedAt = parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null;
    } else if (parsed.data.status === "issued") {
      data.issuedAt = new Date();
    } else if (parsed.data.status === "requested" || parsed.data.status === "rejected" || parsed.data.status === "cancelled") {
      data.issuedAt = null;
    }

    const invoice = await prisma.invoiceRequest.update({
      where: { id },
      data,
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
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    return mapApiError(error);
  }
}
