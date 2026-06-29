import { PlaceholderPage } from "@/components/app/placeholder-page";

export default function ChecksPage() {
  return (
    <PlaceholderPage
      title="发布前检查"
      description="检查合规风险、标题党、AI 味、搜一搜优化和入口规则。"
      items={["广告法极限词", "夸大收益承诺", "诱导分享风险", "关键词自然度", "CTA 是否自然"]}
    />
  );
}

