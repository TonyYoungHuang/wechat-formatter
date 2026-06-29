import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";
import { getActivePromptTemplate } from "@/lib/prompts/service";
import { buildTopicSuggestions } from "@/lib/topics/suggestions";
import { topicGenerateSchema } from "@/lib/topics/schemas";
import { assertCanUseGeneration, recordGenerationUsage } from "@/lib/usage/service";

export async function POST(request: Request) {
  try {
    const current = await requireCurrentUser();
    const parsed = topicGenerateSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("Valid topic generation parameters are required.");
    }

    await assertCanUseGeneration(current.workspace.id, current.workspace.planCode);

    const profile = await prisma.accountProfile.findFirstOrThrow({
      where: { id: parsed.data.accountProfileId, workspaceId: current.workspace.id },
    });
    const promptTemplate = await getActivePromptTemplate("topic_generation", {
      accountName: profile.name,
      niche: profile.niche,
      audience: profile.audience,
      theme: parsed.data.theme,
      monetizationGoal: parsed.data.monetizationGoal,
      avoid: parsed.data.avoid || "无",
    });

    const suggestions = buildTopicSuggestions({
      profile,
      theme: parsed.data.theme,
      monetizationGoal: parsed.data.monetizationGoal,
      avoid: parsed.data.avoid,
      count: parsed.data.count,
    });

    const job = await prisma.generationJob.create({
      data: {
        workspaceId: current.workspace.id,
        accountProfileId: profile.id,
        promptTemplateId: promptTemplate.id ?? undefined,
        type: "topic_generation",
        status: "succeeded",
        input: {
          ...parsed.data,
          promptTemplate: {
            key: promptTemplate.key,
            version: promptTemplate.version,
            source: promptTemplate.source,
          },
        },
        output: { suggestions },
      },
    });

    await recordGenerationUsage(current.workspace.id, 1);

    return NextResponse.json({ suggestions, job });
  } catch (error) {
    return mapApiError(error);
  }
}
