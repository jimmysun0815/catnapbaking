import { getCurrentBatch, getFlavours, getProducts } from "@/lib/data";
import { getSessionUser } from "@/lib/supabase/server";
import { HomeZh } from "@/components/HomeZh";
import { HomeEn } from "@/components/HomeEn";

// 实时数据：库存必须每次请求重新读取，静态化会导致超卖
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [batch, products, flavours, user] = await Promise.all([
    getCurrentBatch(), getProducts(), getFlavours(), getSessionUser(),
  ]);
  const product = products[0];
  const nav = user ? { name: user.name, email: user.email, isAdmin: user.isAdmin } : null;

  return locale === "zh"
    ? <HomeZh batch={batch} product={product} flavours={flavours} user={nav} />
    : <HomeEn batch={batch} product={product} flavours={flavours} user={nav} />;
}
