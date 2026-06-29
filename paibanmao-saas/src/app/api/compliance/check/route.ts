import { NextResponse } from "next/server";
import { z } from "zod";

import { checkContentCompliance } from "@/lib/compliance/check";
import { errorResponse } from "@/lib/http/errors";

const schema = z.object({
  title: z.string().max(160).optional(),
  content: z.string().min(1).max(50000),
  html: z.string().max(200000).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorResponse("Content is required for compliance checking.");
  }

  return NextResponse.json(checkContentCompliance(parsed.data));
}
