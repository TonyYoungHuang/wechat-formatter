import type { Metadata } from "next";

import { ToolPage } from "@/components/marketing/tool-page";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "微信问一问回答生成器",
  description: "生成适合微信问一问的专业回答、讨论话术和公众号关注引导。",
  path: "/tools/question-answer-generator",
  keywords: ["微信问一问", "问一问回答生成器", "问答内容生成", "公众号问答", "微信问答运营"],
});

export default function QuestionAnswerGeneratorPage() {
  return (
    <ToolPage
      title="微信问一问回答生成器"
      description="把一个选题拆成问一问问题库、回答草稿、主持人讨论话术和自然关注引导。适合把公众号内容延展到微信问答流量入口。"
      placeholder="例如：现在做公众号还来得及吗？"
      toolKind="question"
      unlocks={["相关问题库", "回答草稿", "主持人讨论话术", "公众号关注引导"]}
    />
  );
}
