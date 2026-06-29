import { ToolPage } from "@/components/marketing/tool-page";

export default function TopicGeneratorToolPage() {
  return (
    <ToolPage
      title="公众号选题生成器"
      description="输入领域和变现方式，生成适合公众号、小绿书、搜一搜、问一问和朋友圈的选题。"
      placeholder="例如：AI 工具副业，目标读者是普通上班族"
      unlocks={["保存到选题库", "一键生成五入口内容", "按账号档案生成更贴合的选题"]}
    />
  );
}

