import type { MetadataRoute } from "next";

const publicPaths = [
  "",
  "/pricing",
  "/tutorials",
  "/tools/topic-generator",
  "/tools/green-note-generator",
  "/tools/search-keyword-helper",
  "/tools/question-answer-generator",
  "/tools/moments-copy-generator",
  "/tools/compliance-checker",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.APP_URL || "https://paibanmao.cn";

  return publicPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/tools") ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/tools") ? 0.8 : 0.6,
  }));
}

