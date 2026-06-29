import type { Metadata } from "next";
import "artalk/Artalk.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ropgod / Security Journal",
  description: "ropgod 的安全研究与攻防实践博客",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260629161251" },
      {
        url: "/favicon-16x16.png?v=20260629161251",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png?v=20260629161251",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico?v=20260629161251",
    apple: "/apple-touch-icon.png?v=20260629161251",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
