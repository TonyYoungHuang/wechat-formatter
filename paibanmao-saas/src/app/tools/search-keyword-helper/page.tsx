import { ToolPage } from "@/components/marketing/tool-page";

export default function SearchKeywordHelperPage() {
  return (
    <ToolPage
      title="微信搜一搜关键词助手"
      description="为公众号文章生成搜一搜关键词、搜索型标题和摘要优化建议。"
      placeholder="例如：公众号副业怎么赚钱"
      unlocks={["长尾关键词", "搜索型标题", "摘要前 100 字建议", "关键词自然嵌入建议"]}
    />
  );
}

