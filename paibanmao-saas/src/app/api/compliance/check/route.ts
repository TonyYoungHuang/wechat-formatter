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
    return errorResponse("请输入需要检查的内容。");
  }

  return Response.json(checkContentCompliance(parsed.data));
}

