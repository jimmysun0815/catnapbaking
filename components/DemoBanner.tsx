import { usingDemoData } from "@/lib/data";

/** 没接 Supabase / Stripe 时提示当前是演示数据，避免误以为是真实订单 */
export function DemoBanner({ locale }: { locale: "zh" | "en" }) {
  if (!usingDemoData) return null;
  return (
    <div className="demo-bar">
      {locale === "zh"
        ? "演示模式 · 示例数据"
        : "Demo mode · sample data"}
    </div>
  );
}
