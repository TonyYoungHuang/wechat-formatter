import { ToolPage } from "@/components/marketing/tool-page";

export default function MomentsCopyGeneratorPage() {
  return (
    <ToolPage
      title="朋友圈转发文案生成器"
      description="为公众号文章和小绿书生成更自然的朋友圈转发理由和私域互动话术。"
      placeholder="例如：我今天写了一篇公众号副业的文章"
      unlocks={["转发理由", "评论区引导", "资料包领取话术", "私域成交 CTA"]}
    />
  );
}

