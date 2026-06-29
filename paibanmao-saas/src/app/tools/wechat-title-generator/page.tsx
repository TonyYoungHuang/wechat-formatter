import type { Metadata } from "next";

import { WechatTitleGeneratorTool } from "@/components/marketing/tools/wechat-title-generator-tool";

export const metadata: Metadata = {
  title: "公众号标题生成器",
  description:
    "输入公众号选题，生成适合公众号头条、搜一搜、小绿书、问一问和朋友圈转发的标题候选，适合微信副业创作者免费试用。",
};

function appUrl() {
  return (process.env.APP_URL || "https://paibanmao.cn").replace(/\/$/, "");
}

function jsonLdScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default function WechatTitleGeneratorPage() {
  const title = "公众号标题生成器";
  const description = metadata.description as string;
  const canonicalUrl = `${appUrl()}/tools/wechat-title-generator`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: title,
      description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: canonicalUrl,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
      provider: {
        "@type": "Organization",
        name: "排版猫",
        url: appUrl(),
      },
      featureList: ["公众号标题生成", "搜一搜标题角度", "小绿书标题角度", "朋友圈转发标题"],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "首页",
          item: appUrl(),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: title,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }} />
      <WechatTitleGeneratorTool />
    </>
  );
}
