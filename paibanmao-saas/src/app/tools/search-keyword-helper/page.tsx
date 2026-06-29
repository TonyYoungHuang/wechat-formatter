import type { Metadata } from "next";

import { ToolPage } from "@/components/marketing/tool-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "微信搜一搜关键词助手",
  description: "为公众号文章生成搜一搜关键词、搜索型标题、摘要优化建议和长尾问题结构。",
  path: "/tools/search-keyword-helper",
  keywords: ["微信搜一搜", "搜一搜关键词", "公众号 SEO", "微信搜索优化", "公众号关键词助手"],
});

export default function SearchKeywordHelperPage() {
  return (
    <ToolPage
      title="微信搜一搜关键词助手"
      description="围绕一个公众号选题，生成主关键词、长尾关键词、搜索型标题和摘要前 100 字建议，帮助文章在微信搜一搜里更容易被需要的人看到。"
      placeholder="例如：公众号副业怎么赚钱"
      toolKind="search"
      unlocks={["长尾关键词地图", "搜索型标题候选", "摘要前 100 字建议", "关键词自然嵌入建议"]}
    />
  );
}
