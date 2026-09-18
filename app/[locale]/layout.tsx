import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isTeaser } from "@/lib/site-mode";
import { DemoBanner } from "@/components/DemoBanner";
import type { Locale } from "@/lib/types";

export function generateStaticParams() {
  return [{ locale: "zh" }, { locale: "en" }];
}

/**
 * 中英两套叙事，分享出去的标题和缩略图也要分开。
 * 微信群里发链接看到的就是这张图。
 */
export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";

  // 预热期不提开单、自取、限量这些运营信息
  const title = isTeaser
    ? (zh ? "不太甜研究所 · 即将开张" : "Cat Nap · Opening soon")
    : (zh ? "不太甜研究所 · 手工曲奇" : "Cat Nap · Handmade Cookies");

  const description = isTeaser
    ? (zh
        ? "减糖 70% 的手工曲奇，正在 Richmond BC 筹备中。留下邮箱，开业时以邮件通知您。"
        : "Handmade cookies, coming soon to Richmond, BC. Leave your email and we'll tell you when we open.")
    : (zh
        ? "外脆内软的手工曲奇，Richmond BC 新鲜现烤，限量发售，周日自取。"
        : "Crisp edges, soft centres. Canadian-owned, freshly baked in Richmond, BC.");
  const image = zh ? "/brand/og-zh.png" : "/brand/og-en.png";

  return {
    title,
    description,
    alternates: { languages: { "zh-CN": "/zh", "en-CA": "/en" } },
    openGraph: {
      title, description,
      url: `/${locale}`,
      siteName: zh ? "不太甜研究所" : "Cat Nap Baking",
      locale: zh ? "zh_CN" : "en_CA",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function LocaleLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "zh" && locale !== "en") notFound();
  const loc = locale as Locale;

  return (
    <div lang={loc === "zh" ? "zh-CN" : "en-CA"}>
      <DemoBanner locale={loc} />
      {children}
    </div>
  );
}
