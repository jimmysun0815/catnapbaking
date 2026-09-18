import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentBatch, getFlavours, getProducts, effectivePrice } from "@/lib/data";
import { content } from "@/lib/content";
import { Header, Footer } from "@/components/SiteChrome";
import { getSessionUser } from "@/lib/supabase/server";
import { Countdown, CapacityMeter } from "@/components/BatchStatus";
import { OrderForm } from "@/components/OrderForm";
import type { Locale } from "@/lib/types";
import { getIsTeaser } from "@/lib/site-mode";

// 实时库存，静态化会导致超卖
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;

  // 预热期下单相关页面一律回首页
  if (await getIsTeaser()) redirect(`/${locale}`);
  const zh = locale === "zh";
  const t = content(locale);

  const [batch, products, flavours, user] = await Promise.all([
    getCurrentBatch(), getProducts(), getFlavours(), getSessionUser(),
  ]);
  const nav = user ? { name: user.name, email: user.email, isAdmin: user.isAdmin } : null;
  const product = products[0];

  // 预热期本页在上面已经 redirect 了，能走到这里必然是 live
  const shell = (children: React.ReactNode) => (
    <div className={`site ${zh ? "zh-site" : "en-site"}`}>
      {!zh && <div className="en-noise" />}
      <Header locale={locale} user={nav} isTeaser={false} />
      <main>{children}</main>
      <Footer locale={locale} isTeaser={false} />
    </div>
  );

  if (!batch) {
    return shell(
      <section className="empty-shell">
        <div className="section-index">next drop</div>
        <h1>{t.order.noBatch}</h1>
        <p>{t.order.noBatchDesc}</p>
        <Link href={`/${locale}`} className="order-button">{zh ? "返回首页" : "Back home"}</Link>
      </section>
    );
  }

  const remaining = Math.max(0, batch.capacity_boxes - batch.boxes_taken);
  const prices = Object.fromEntries(product.variants.map((v) => [v.id, effectivePrice(batch, v)]));

  return shell(
    <section className="page-shell">
      <div className="page-head">
        <div>
          <div className="section-index">{zh ? "本期开单" : "this week"}</div>
          <h1>{zh ? batch.name_zh : batch.name_en}</h1>
        </div>
        <Countdown
          closesAt={batch.closes_at}
          label={t.order.closesIn}
          closedLabel={t.order.closed}
          locale={locale}
        />
      </div>

      <CapacityMeter
        taken={batch.boxes_taken}
        total={batch.capacity_boxes}
        remaining={remaining}
        remainingLabel={t.order.remaining}
        pickupLabel={t.order.pickupAt}
        pickupValue={batch.pickup_address}
      />

      <OrderForm
        locale={locale}
        batch={batch}
        product={product}
        flavours={flavours}
        prices={prices}
        signedIn={!!user}
        prefill={{ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "" }}
        t={{
          subtotal: t.order.subtotal, pickTime: t.order.pickTime,
          slotFull: t.order.slotFull, checkout: t.order.checkout,
          soldOut: t.order.soldOut, gstNote: t.order.gstNote,
        }}
      />

      {(zh ? batch.pickup_note_zh : batch.pickup_note_en) && (
        <p className="admin-foot-note" style={{ maxWidth: 620 }}>
          {zh ? batch.pickup_note_zh : batch.pickup_note_en}
        </p>
      )}
    </section>
  );
}
