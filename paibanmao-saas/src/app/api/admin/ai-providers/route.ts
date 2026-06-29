import { NextResponse } from "next/server";
import { getAiProviderStatus } from "@/lib/ai/provider";
import { aiProviderPatchSchema } from "@/lib/ai/schemas";
import { requireSiteAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { errorResponse, mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    await requireSiteAdmin();
    return NextResponse.json(await getAiProviderStatus());
  } catch (error) {
    return mapApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSiteAdmin();
    const parsed = aiProviderPatchSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return errorResponse("AI provider configuration payload is invalid.");
    }

    const provider = await prisma.aiProvider.upsert({
      where: { name: parsed.data.name },
      create: {
        name: parsed.data.name,
        type: parsed.data.type,
        baseUrl: parsed.data.baseUrl,
        apiKeyRef: parsed.data.apiKeyRef,
        active: parsed.data.active,
        models: {
          create: parsed.data.models,
        },
      },
      update: {
        type: parsed.data.type,
        baseUrl: parsed.data.baseUrl,
        apiKeyRef: parsed.data.apiKeyRef,
        active: parsed.data.active,
        models: {
          deleteMany: {},
          create: parsed.data.models,
        },
      },
      include: {
        models: true,
      },
    });

    return NextResponse.json({
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKeyRef: provider.apiKeyRef,
        active: provider.active,
        models: provider.models,
      },
    });
  } catch (error) {
    return mapApiError(error);
  }
}
