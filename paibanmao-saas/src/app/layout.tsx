import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WechatSupportWidget } from "@/components/support/wechat-support-widget";
import { siteUrl } from "@/lib/seo/metadata";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "排版猫 - 微信内容增长工作台",
    template: "%s | 排版猫",
  },
  description: "排版猫帮助公众号副业创作者用一个选题布局公众号、小绿书、搜一搜、问一问和朋友圈五个微信入口。",
  metadataBase: new URL(siteUrl()),
  applicationName: "排版猫",
  creator: "排版猫",
  publisher: "排版猫",
  keywords: ["排版猫", "公众号排版", "公众号写作", "微信公众号工具", "小绿书", "搜一搜优化", "问一问", "微信内容矩阵"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "排版猫",
    title: "排版猫 - 微信内容增长工作台",
    description: "一个选题，布局公众号、小绿书、搜一搜、问一问和朋友圈五个微信入口。",
    url: siteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "排版猫 - 微信内容增长工作台",
    description: "一个选题，布局公众号、小绿书、搜一搜、问一问和朋友圈五个微信入口。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-[#f6faf7] text-slate-950">
        {children}
        <WechatSupportWidget />
      </body>
    </html>
  );
}
