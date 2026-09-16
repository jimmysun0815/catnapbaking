import type { Metadata } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // OG 图用相对路径写，靠这个拼成绝对地址；微信只认绝对地址
  metadataBase: new URL(SITE),
  title: "不太甜研究所 · Cat Nap Baking",
  description: "手工曲奇，Richmond BC 每周现烤。Handmade cookies baked weekly in Richmond, BC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Noto+Sans+SC:wght@300;400;500&family=Space+Grotesk:wght@400;500;600&family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
