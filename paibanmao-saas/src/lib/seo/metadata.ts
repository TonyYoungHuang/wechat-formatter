import type { Metadata } from "next";

const siteName = "排版猫";
const defaultDescription =
  "排版猫帮助公众号副业创作者用一个选题布局公众号、小绿书、搜一搜、问一问和朋友圈五个微信入口。";

export function siteUrl() {
  return (process.env.APP_URL || "https://paibanmao.cn").replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function jsonLdScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function createPublicMetadata(input: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  type?: "website" | "article";
}): Metadata {
  const description = input.description || defaultDescription;
  const path = input.path || "/";
  const url = absoluteUrl(path);

  return {
    title: input.title,
    description,
    keywords: input.keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: input.type || "website",
      locale: "zh_CN",
      siteName,
      title: input.title,
      description,
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
    },
  };
}
