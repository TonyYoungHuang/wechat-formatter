import { NextResponse } from "next/server";

import { accountKnowledgeItemSchema } from "@/lib/account-knowledge/schemas";
import { buildKnowledgeTags } from "@/lib/account-knowledge/tagging";
import { buildKnowledgeTagsWithAi } from "@/lib/ai/knowledge-tags";
import { withTimeout } from "@/lib/async/timeout";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await prisma.accountProfile.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });

    const items = await prisma.accountKnowledgeItem.findMany({
      where: { accountProfileId: id, workspaceId: current.workspace.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;
    const parsed = accountKnowledgeItemSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("知识库内容至少需要标题和 10 个字以上的正文。");
    }

    await prisma.accountProfile.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
      select: { id: true },
    });
    const tagging = await withTimeout(
      buildKnowledgeTagsWithAi({
        title: parsed.data.title,
        sourceType: parsed.data.sourceType,
        content: parsed.data.content,
        manualTags: parsed.data.tags,
      }),
      Number(process.env.KNOWLEDGE_TAGGING_TIMEOUT_MS || 18000),
      "知识库 AI 标签提取超时，已先使用基础标签提取。",
    ).catch(() =>
      buildKnowledgeTags({
        title: parsed.data.title,
        sourceType: parsed.data.sourceType,
        content: parsed.data.content,
        manualTags: parsed.data.tags,
      }),
    );

    const item = await prisma.accountKnowledgeItem.create({
      data: {
        title: parsed.data.title,
        sourceType: parsed.data.sourceType,
        content: "",
        contentDigest: tagging.contentDigest,
        contentCharCount: tagging.contentCharCount,
        tags: tagging.tags,
        active: parsed.data.active,
        workspaceId: current.workspace.id,
        accountProfileId: id,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
