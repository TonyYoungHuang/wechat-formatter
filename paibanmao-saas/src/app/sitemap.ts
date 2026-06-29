import type { MetadataRoute } from "next";

import { tutorialArticles } from "@/lib/seo/tutorials";

const publicPaths = [
  "",
  "/pricing",
  "/tutorials",
  "/tools/wechat-title-generator",
  "/tools/topic-generator",
  "/tools/green-note-generator",
  "/tools/search-keyword-helper",
  "/tools/question-answer-generator",
  "/tools/moments-copy-generator",
  "/tools/compliance-checker",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || "https://paibanmao.cn";

  const toolAndPageUrls = publicPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/tools") ? ("weekly" as const) : ("monthly" as const),
    priority: path === "" ? 1 : path.startsWith("/tools") ? 0.8 : 0.6,
  }));

  const tutorialUrls = tutorialArticles.map((article) => ({
    url: `${baseUrl}/tutorials/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...toolAndPageUrls, ...tutorialUrls];
}
