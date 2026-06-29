import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "排版猫 - 微信内容增长工作台",
    template: "%s | 排版猫",
  },
  description: "排版猫帮助公众号副业创作者用一个选题布局公众号、小绿书、搜一搜、问一问和朋友圈五个微信入口。",
  metadataBase: new URL(process.env.APP_URL || "https://paibanmao.cn"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-[#f6faf7] text-slate-950">{children}</body>
    </html>
  );
}
