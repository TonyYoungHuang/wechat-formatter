import { ToolPage } from "@/components/marketing/tool-page";

export default function ComplianceCheckerPage() {
  return (
    <ToolPage
      title="公众号发布前检查"
      description="检查广告法极限词、夸大承诺、诱导分享、AI 味和搜一搜优化问题。"
      placeholder="粘贴你的公众号正文、小绿书文案或问一问回答"
      unlocks={["合规风险", "标题风险", "AI 味建议", "CTA 自然度", "入口规则检查"]}
    />
  );
}

