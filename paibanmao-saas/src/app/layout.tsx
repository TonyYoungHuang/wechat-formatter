import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "排版猫 - 微信内容增长工作台",
  description:
    "排版猫帮助公众号副业创作者用一个选题布局公众号、小绿书、搜一搜、问一问和朋友圈五个微信入口。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f6faf7] text-slate-950">{children}</body>
    </html>
  );
}
