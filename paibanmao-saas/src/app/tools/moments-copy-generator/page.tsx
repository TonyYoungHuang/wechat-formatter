import type { Metadata } from "next";

import { ToolPage } from "@/components/marketing/tool-page";

export const metadata: Metadata = {
  title: "朋友圈转发文案生成器",
  description: "为公众号文章和小绿书内容生成自然的朋友圈转发理由、互动话术和私域 CTA。",
};

export default function MomentsCopyGeneratorPage() {
  return (
    <ToolPage
      title="朋友圈转发文案生成器"
      description="为公众号文章、小绿书内容和问一问回答生成更像真人表达的朋友圈转发理由，附带评论区互动、资料包领取和私域成交 CTA。"
      placeholder="例如：我今天写了一篇公众号副业的文章，想发朋友圈引导朋友阅读"
      toolKind="moments"
      unlocks={["转发理由", "评论区引导", "资料包领取话术", "私域成交 CTA"]}
    />
  );
}
