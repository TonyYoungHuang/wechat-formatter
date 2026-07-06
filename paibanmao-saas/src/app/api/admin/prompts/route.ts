import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSiteAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { defaultPromptTemplates, defaultPromptTemplateVersions, upsertPromptTemplate } from "@/lib/prompts/service";

const promptPatchSchema = z.object({
  prompts: z.record(
    z.string(),
    z.object({
      content: z.string().min(20),
      version: z.number().int().min(1).optional(),
      active: z.boolean().optional(),
    }),
  ),
});

export async function GET() {
  try {
    await requireSiteAdmin();
    const templates = await prisma.promptTemplate.findMany({
      orderBy: [{ key: "asc" }, { version: "desc" }],
    });

    const activeByKey = Object.keys(defaultPromptTemplates).map((key) => {
      const active = templates.find((template) => template.key === key && template.active);
      const defaultVersion = defaultPromptTemplateVersions[key] ?? 0;
      const useActive = Boolean(active && active.version >= defaultVersion);
      return {
        key,
        version: useActive ? active?.version ?? 0 : defaultVersion,
        content: useActive ? active?.content ?? "" : defaultPromptTemplates[key],
        active: useActive ? active?.active ?? true : true,
        source: useActive ? "database" : active ? "default_newer_than_database" : "default",
      };
    });

    return NextResponse.json({
      prompts: activeByKey,
      history: templates,
    });
  } catch (error) {
    return mapApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSiteAdmin();
    const parsed = promptPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Prompt template payload is invalid.");
    }

    const prompts = await Promise.all(
      Object.entries(parsed.data.prompts).map(([key, patch]) =>
        upsertPromptTemplate({
          key,
          content: patch.content,
          version: patch.version,
          active: patch.active,
        }),
      ),
    );

    return NextResponse.json({ prompts });
  } catch (error) {
    return mapApiError(error);
  }
}
