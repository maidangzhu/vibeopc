import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeOPC - AI 时代的数字名片",
  description: "帮任何人快速生成专属 CLI 名片工具，让 AI / 他人只需一个命令就能了解你是谁、会什么、在哪里找到你。",
  keywords: ["CLI", "名片", "AI", "个人品牌", "数字名片"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
