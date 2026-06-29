import { ToolPage } from "@/components/marketing/tool-page";

export default function GreenNoteGeneratorPage() {
  return (
    <ToolPage
      title="小绿书文案生成器"
      description="把公众号选题改写成适合微信图片文字消息的小绿书短图文和图片页脚本。"
      placeholder="例如：普通人做公众号副业的第一步"
      unlocks={["3/6/9 图脚本", "封面图提示词", "每页图片提示词", "朋友圈转发卡片文案"]}
    />
  );
}

