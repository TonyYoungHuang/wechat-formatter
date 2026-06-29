import type { Metadata } from "next";

import { ToolPage } from "@/components/marketing/tool-page";

export const metadata: Metadata = {
  title: "小绿书文案生成器",
  description: "把公众号选题改写成适合微信小绿书图文形态的短文案、封面文案和图片提示词。",
};

export default function GreenNoteGeneratorPage() {
  return (
    <ToolPage
      title="小绿书文案生成器"
      description="把公众号长文选题改写成更适合微信图文卡片的小绿书文案，生成封面标题、3/6/9 图脚本、每页图片提示词和朋友圈转发卡片。"
      placeholder="例如：普通人做公众号副业的第一步"
      toolKind="green_note"
      unlocks={["3/6/9 图脚本", "封面图提示词", "每页图片提示词", "朋友圈转发卡片文案"]}
    />
  );
}
