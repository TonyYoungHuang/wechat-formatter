import type { Metadata } from "next";

import { WechatTitleGeneratorTool } from "@/components/marketing/tools/wechat-title-generator-tool";
import { absoluteUrl, createPublicMetadata, jsonLdScript, siteUrl } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  title: "公众号标题生成器",
  description:
    "输入公众号选题，生成适合公众号头条、搜一搜、小绿书、问一问和朋友圈转发的标题候选，适合微信副业创作者免费试用。",
  path: "/tools/wechat-title-generator",
  keywords: ["公众号标题生成器", "公众号标题", "微信标题生成", "搜一搜标题", "小绿书标题"],
});

export default function WechatTitleGeneratorPage() {
  const title = "公众号标题生成器";
  const description = metadata.description as string;
  const canonicalUrl = absoluteUrl("/tools/wechat-title-generator");
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
        url: siteUrl(),
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
          item: siteUrl(),
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
