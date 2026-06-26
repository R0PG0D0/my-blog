import type { Metadata } from "next";
import "artalk/Artalk.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ropgod / Security Journal",
  description: "ropgod 的安全研究与攻防实践博客",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
