import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const order = await prisma.paymentOrder.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    return Response.json({ order });
  } catch (error) {
    return mapApiError(error);
  }
}

