import { NextResponse } from "next/server";

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export function mapApiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return errorResponse("Please sign in first.", 401);
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return errorResponse("You do not have permission to perform this action.", 403);
  }

  const message = error instanceof Error ? error.message : "Request failed.";
  return errorResponse(message, 400);
}
