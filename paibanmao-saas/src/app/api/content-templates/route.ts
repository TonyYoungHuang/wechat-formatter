import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { contentTemplateSchema } from "@/lib/templates/schemas";

function parseTags(value: string | null) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export async function GET(request: Request) {
  try {
    const current = await requireCurrentUser();
    const url = new URL(request.url);
    const accountProfileId = url.searchParams.get("accountProfileId") || undefined;
    const entry = url.searchParams.get("entry") || undefined;
    const q = url.searchParams.get("q") || undefined;
    const tags = parseTags(url.searchParams.get("tags"));

    const templates = await prisma.contentTemplate.findMany({
      where: {
        workspaceId: current.workspace.id,
        active: true,
        ...(accountProfileId ? { accountProfileId } : {}),
        ...(entry ? { entry: entry as never } : {}),
        ...(tags.length ? { tags: { hasEvery: tags } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        accountProfile: { select: { id: true, name: true, niche: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = contentTemplateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Template payload is invalid.");
    }

    if (parsed.data.accountProfileId) {
      await prisma.accountProfile.findFirstOrThrow({
        where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
        select: { id: true },
      });
    }

    const template = await prisma.contentTemplate.create({
      data: {
        workspaceId: current.workspace.id,
        accountProfileId: parsed.data.accountProfileId,
        title: parsed.data.title,
        category: parsed.data.category,
        entry: parsed.data.entry,
        content: parsed.data.content,
        tags: parsed.data.tags,
        active: parsed.data.active,
      },
      include: {
        accountProfile: { select: { id: true, name: true, niche: true } },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}
