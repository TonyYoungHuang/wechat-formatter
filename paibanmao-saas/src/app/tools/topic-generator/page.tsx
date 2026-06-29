import type { Metadata } from "next";

import { ToolPage } from "@/components/marketing/tool-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "公众号选题生成器",
  description: "输入领域、读者和变现目标，生成适合公众号、小绿书、搜一搜、问一问和朋友圈的一组内容选题。",
  path: "/tools/topic-generator",
  keywords: ["公众号选题生成器", "公众号选题", "微信内容选题", "公众号副业选题", "内容矩阵选题"],
});

export default function TopicGeneratorToolPage() {
  return (
    <ToolPage
      title="公众号选题生成器"
      description="输入领域、目标读者和变现方式，生成适合公众号、小绿书、搜一搜、问一问和朋友圈的选题。适合副业号主、个人 IP 和本地服务创作者快速搭建一周内容计划。"
      placeholder="例如：AI 工具副业，目标读者是普通上班族，想转化资料包和咨询"
      toolKind="topic"
      unlocks={["保存到选题库", "一键生成五入口内容", "按账号档案生成更贴合的选题", "加入内容日历形成发布节奏"]}
    />
  );
}
