import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function businessErrorStatus(message: string) {
  if (message.startsWith("Current plan allows")) {
    return 409;
  }

  if (message === "Create an account profile first.") {
    return 409;
  }

  if (message === "AI provider is not configured.") {
    return 503;
  }

  return null;
}

export function mapApiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return errorResponse("Please sign in first.", 401);
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return errorResponse("You do not have permission to perform this action.", 403);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return errorResponse("Resource not found.", 404);
    }

    if (error.code === "P2002") {
      return errorResponse("This record already exists.", 409);
    }

    if (error.code === "P2003") {
      return errorResponse("This record is still linked to other data.", 409);
    }
  }

  const message = error instanceof Error ? error.message : "Request failed.";
  const status = businessErrorStatus(message);

  if (status) {
    return errorResponse(message, status);
  }

  return errorResponse(process.env.NODE_ENV === "production" ? "Request failed." : message, 500);
}
