import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logger } from "@/lib/ops/logger";

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

  if (message === "Security token is invalid or expired.") {
    return 400;
  }

  if (message.includes("激活码")) {
    return 400;
  }

  return null;
}

function localizeErrorMessage(message: string) {
  const labels: Record<string, string> = {
    "Create an account profile first.": "请先创建一个账号档案。账号档案会告诉 AI：你是谁、写给谁、用什么语气写。",
    "A valid topic is required.": "请先输入一个明确的选题。",
    "Please sign in first.": "请先登录。",
    "Request failed.": "请求失败，请稍后重试。",
  };
  const dailyGenerationMatch = message.match(/^Current plan allows (\d+) generations per day\.$/);
  if (dailyGenerationMatch) {
    return `当前套餐每天可使用 ${dailyGenerationMatch[1]} 次文字生成，今日额度已经用完。`;
  }
  const monthlyGenerationMatch = message.match(/^Current plan allows (\d+) generations per month\.$/);
  if (monthlyGenerationMatch) {
    return `当前套餐每月可使用 ${monthlyGenerationMatch[1]} 次文字生成，本月额度已经用完。`;
  }
  const dailyImageMatch = message.match(/^Current plan allows (\d+) AI images per day\.$/);
  if (dailyImageMatch) {
    return `当前套餐每天可生成 ${dailyImageMatch[1]} 张图片，今日额度已经用完。`;
  }
  const monthlyImageMatch = message.match(/^Current plan allows (\d+) AI images per month\.$/);
  if (monthlyImageMatch) {
    return `当前套餐每月可生成 ${monthlyImageMatch[1]} 张图片，本月额度已经用完。`;
  }
  return labels[message] || message;
}

function prismaErrorCode(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }

  return null;
}

export function mapApiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return errorResponse("请先登录。", 401);
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return errorResponse("你没有权限执行这个操作。", 403);
  }

  const code = prismaErrorCode(error);

  if (code) {
    if (code === "P2025") {
      return errorResponse("Resource not found.", 404);
    }

    if (code === "P2002") {
      return errorResponse("This record already exists.", 409);
    }

    if (code === "P2003") {
      return errorResponse("This record is still linked to other data.", 409);
    }
  }

  const message = error instanceof Error ? error.message : "Request failed.";
  const status = businessErrorStatus(message);

  if (status) {
    return errorResponse(localizeErrorMessage(message), status);
  }

  logger.error("Unhandled API error", { error });
  return errorResponse(process.env.NODE_ENV === "production" ? "请求失败，请稍后重试。" : localizeErrorMessage(message), 500);
}
