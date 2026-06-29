import { ToolPage } from "@/components/marketing/tool-page";

export default function QuestionAnswerGeneratorPage() {
  return (
    <ToolPage
      title="微信问一问回答生成器"
      description="生成适合问一问的专业回答、讨论话术和关注引导。"
      placeholder="例如：现在做公众号还来得及吗？"
      unlocks={["问题库", "回答草稿", "主持人讨论话术", "公众号关注引导"]}
    />
  );
}

