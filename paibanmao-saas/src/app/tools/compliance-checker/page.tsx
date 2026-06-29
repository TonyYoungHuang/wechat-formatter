import type { Metadata } from "next";

import { ToolPage } from "@/components/marketing/tool-page";

export const metadata: Metadata = {
  title: "公众号发布前检查工具",
  description: "检查公众号、小绿书和问一问内容中的极限词、夸大承诺、AI 味、搜索优化和 CTA 风险。",
};

export default function ComplianceCheckerPage() {
  return (
    <ToolPage
      title="公众号发布前检查工具"
      description="发布前检查广告法极限词、夸大承诺、诱导分享、AI 味、搜一搜优化和 CTA 自然度。工具只做辅助提示，最终发布责任仍由创作者自行判断。"
      placeholder="粘贴你的公众号正文、小绿书文案或问一问回答"
      unlocks={["合规风险", "标题风险", "AI 味建议", "CTA 自然度", "入口规则检查"]}
    />
  );
}
