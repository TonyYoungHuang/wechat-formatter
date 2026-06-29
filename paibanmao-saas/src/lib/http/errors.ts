export function errorResponse(message: string, status = 400) {
  return Response.json({ message }, { status });
}

export function mapApiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return errorResponse("请先登录。", 401);
  }

  const message = error instanceof Error ? error.message : "请求失败。";
  return errorResponse(message, 400);
}

