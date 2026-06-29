import { PlaceholderPage } from "@/components/app/placeholder-page";

export default function TopicsPage() {
  return (
    <PlaceholderPage
      title="选题库"
      description="保存适合公众号、小绿书、搜一搜、问一问和朋友圈的可复用选题。"
      items={["AI 生成选题", "按入口筛选", "按涨粉/搜索/转化目标筛选", "一键进入五入口生成器"]}
    />
  );
}

