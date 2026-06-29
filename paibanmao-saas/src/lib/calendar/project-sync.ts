import type { Prisma, TopicStatus } from "@prisma/client";

const statusRank: Record<TopicStatus, number> = {
  idea: 0,
  generated: 1,
  editing: 2,
  ready: 3,
  published: 4,
  reviewed: 5,
};

function shouldAdvanceStatus(current: TopicStatus, next: TopicStatus) {
  return statusRank[next] >= statusRank[current];
}

export async function syncProjectStatusFromCalendarItem(
  tx: Prisma.TransactionClient,
  input: {
    workspaceId: string;
    projectId: string | null;
    status: TopicStatus;
    publishedAt: Date | null;
  },
) {
  if (!input.projectId || !["ready", "published", "reviewed"].includes(input.status)) {
    return;
  }

  const project = await tx.contentProject.findFirst({
    where: { id: input.projectId, workspaceId: input.workspaceId },
    select: { id: true, status: true, publishedAt: true },
  });

  if (!project || !shouldAdvanceStatus(project.status, input.status)) {
    return;
  }

  await tx.contentProject.update({
    where: { id: project.id },
    data: {
      status: input.status,
      publishedAt: input.status === "published" || input.status === "reviewed" ? input.publishedAt || project.publishedAt || new Date() : project.publishedAt,
    },
  });
}
