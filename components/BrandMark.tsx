import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/types";

/**
 * 品牌标志：蜷起来抱着曲奇的猫。原图 1920px 存在 assets/，
 * 这里只用压缩过的 128px（导航 43px、页脚 31px，二倍屏足够）。
 * 猫身是深棕、线条是奶油色、底透明，深浅两种圆底上都读得出来。
 */
export function BrandLockup({ locale, tone }: { locale: Locale; tone: "cream" | "ink" }) {
  const zh = locale === "zh";
  return (
    <Link href={`/${locale}`} className="brand-lockup" aria-label={zh ? "回到首页" : "Back to home"}>
      <span className="brand-mark-wrap">
        <Image
          src="/brand/cat-nap-mark-128.png"
          alt=""
          width={128}
          height={128}
          className="brand-mark"
          priority
        />
      </span>
      <span className="brand-name">
        <strong>{zh ? "不太甜研究所" : "CAT NAP"}</strong>
        <small>{zh ? "CAT NAP BAKING" : "BAKING LTD. · RICHMOND BC"}</small>
      </span>
    </Link>
  );
}

/** 大尺寸用：流程段落的圆形舞台、下单成功页 */
export function CatMarkLarge({ size = 220 }: { size?: number }) {
  return (
    <Image
      src="/brand/cat-nap-mark-512.png"
      alt=""
      width={size}
      height={size}
      style={{ display: "block", height: "auto", width: size }}
    />
  );
}
