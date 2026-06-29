import type { Metadata } from "next";

import { WechatTitleGeneratorTool } from "@/components/marketing/tools/wechat-title-generator-tool";

export const metadata: Metadata = {
  title: "公众号标题生成器 - 排版猫",
  description:
    "输入公众号选题，生成适合公众号头条、搜一搜、小绿书、问一问和朋友圈转发的标题候选，适合微信副业创作者免费试用。",
};

export default function WechatTitleGeneratorPage() {
  return <WechatTitleGeneratorTool />;
}
