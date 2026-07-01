import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { accountKnowledgeItemPatchSchema } from "@/lib/account-knowledge/schemas";
import { buildKnowledgeTags } from "@/lib/account-knowledge/tagging";
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

    const existing = await assertKnowledgeItem(current.workspace.id, id, knowledgeId);
    const data: Prisma.AccountKnowledgeItemUpdateInput = { ...parsed.data };

    if (parsed.data.content !== undefined || parsed.data.tags !== undefined || parsed.data.title !== undefined || parsed.data.sourceType !== undefined) {
      const tagging = buildKnowledgeTags({
        title: parsed.data.title ?? existing.title,
        sourceType: parsed.data.sourceType ?? existing.sourceType,
        content: parsed.data.content ?? "",
        manualTags: parsed.data.tags ?? existing.tags,
      });
      data.content = "";
      data.contentDigest = tagging.contentDigest ?? existing.contentDigest;
      data.contentCharCount = tagging.contentCharCount || existing.contentCharCount;
      data.tags = tagging.tags;
    }

    const item = await prisma.accountKnowledgeItem.update({
      where: { id: knowledgeId },
      data,
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
