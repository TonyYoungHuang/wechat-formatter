import { requireCurrentUser } from "@/lib/auth/session";
import { assertCanCreateAccountProfile } from "@/lib/account-profiles/service";
import { prisma } from "@/lib/db/prisma";
import { mapApiError } from "@/lib/http/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const current = await requireCurrentUser();
    const { id } = await context.params;

    await assertCanCreateAccountProfile(current.workspace.id, current.workspace.planCode);

    const source = await prisma.accountProfile.findFirstOrThrow({
      where: { id, workspaceId: current.workspace.id },
    });

    const profile = await prisma.accountProfile.create({
      data: {
        workspaceId: current.workspace.id,
        name: `${source.name} 副本`,
        type: source.type,
        niche: source.niche,
        persona: source.persona,
        audience: source.audience,
        audiencePainPoints: source.audiencePainPoints,
        productOrService: source.productOrService,
        monetizationMethods: source.monetizationMethods,
        tone: source.tone,
        commonCta: source.commonCta,
        forbiddenWords: source.forbiddenWords,
        sampleText: source.sampleText,
        isDefault: false,
      },
    });

    return Response.json({ profile }, { status: 201 });
  } catch (error) {
    return mapApiError(error);
  }
}

