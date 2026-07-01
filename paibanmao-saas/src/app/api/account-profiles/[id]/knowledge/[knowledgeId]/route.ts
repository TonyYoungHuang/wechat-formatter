import { NextResponse } from "next/server";

import { accountKnowledgeItemPatchSchema } from "@/lib/account-knowledge/schemas";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string; knowledgeId: string }>;
};

async function assertKnowledgeItem(workspaceId: string, accountProfileId: string, knowledgeId: string) {
  return prisma.accountKnowledgeItem.findFirstOrThrow({
    where: {
      id: knowledgeId,
      workspaceId,
      accountProfileId,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id, knowledgeId } = await context.params;
    const parsed = accountKnowledgeItemPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("知识库更新内容格式不正确。");
    }

    await assertKnowledgeItem(current.workspace.id, id, knowledgeId);

    const item = await prisma.accountKnowledgeItem.update({
      where: { id: knowledgeId },
      data: parsed.data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id, knowledgeId } = await context.params;

    await assertKnowledgeItem(current.workspace.id, id, knowledgeId);
    await prisma.accountKnowledgeItem.delete({ where: { id: knowledgeId } });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return mapApiError(error);
  }
}
