import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ChevronRight, Clock3, MapPin, Sparkles, Star } from "lucide-react";
import { zh } from "@/lib/content";
import { formatCents } from "@/lib/money";
import { effectivePrice } from "@/lib/data";
import { Header, Footer, type NavUser } from "@/components/SiteChrome";
import { CatMarkLarge } from "@/components/BrandMark";
import { Waitlist } from "@/components/Waitlist";
import { isTeaser } from "@/lib/site-mode";
import type { Batch, Flavour, Product } from "@/lib/types";

/**
 * 中文首页 = 安静的茶室编辑感。
 * 核心主张「减糖 70%」按 CFIA 规则，参照物与每份克数必须与主张同屏，
 * 就是 h1 下面那行 .claim-note，不要删。
 */
/** 预热期讲手艺，不讲怎么买 */
const CRAFT_STEPS = [
  { n: "01", t: "选料", d: "只用我们愿意放在自己茶杯旁边的原料。黄油、面粉、鸡蛋都来自加拿大本地。" },
  { n: "02", t: "配方", d: "把糖收低，让可可、茶香和黄油的味道自己出来。前后试了几十版。" },
  { n: "03", t: "手工", d: "小批量、手工整形。出炉后静置十几分钟定型，这一步决定外脆内软。" },
];

export function HomeZh({
  batch, product, flavours, user = null,
}: { batch: Batch | null; product: Product; flavours: Flavour[]; user?: NavUser }) {
  const t = zh;
  const remaining = batch ? Math.max(0, batch.capacity_boxes - batch.boxes_taken) : 0;
  const open = batch?.status === "open" && remaining > 0;
  const inBatch = flavours.filter((f) => batch?.flavour_ids.includes(f.id));
  const shown = (inBatch.length ? inBatch : flavours).slice(0, 3);
  const firstSlot = batch?.slots[0];

  const slotWindow = firstSlot
    ? `${new Date(firstSlot.starts_at).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })} ` +
      `${new Date(firstSlot.starts_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` +
      `–${new Date(batch!.slots[batch!.slots.length - 1].ends_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
    : "开单后公布";

  return (
    <div className="site zh-site">
      <Header locale="zh" anchors user={user} />

      <main>
        {/* ---------------------------------------------------- 主张 */}
        <section className="zh-hero hero-shell">
          <div className="hero-copy">
            <div className="kicker"><span className="kicker-dot" /> Richmond · Vancouver / 每周现烤</div>
            <h1>{t.hero.headline}</h1>
            {/* CFIA 比较型营养声明的法定说明 */}
            <p className="claim-note">{t.hero.claimFootnote}</p>
            <p className="hero-lede">{t.hero.lead}</p>

            <div className="hero-cta-row">
              {isTeaser ? (
                <a href="#notify" className="order-button">
                  开门时通知我
                  <ArrowUpRight size={16} strokeWidth={1.8} />
                </a>
              ) : (
                <Link href="/zh/order" className="order-button">
                  {open ? t.hero.cta : t.hero.ctaClosed}
                  <ArrowUpRight size={16} strokeWidth={1.8} />
                </Link>
              )}
              <a className="text-link" href="#why">了解我们的配方 <ChevronRight size={15} /></a>
            </div>

            <div className="hero-proof">
              <span><Sparkles size={14} /> 秘方配方</span>
              <span><span className="tiny-divider" /> 外脆内软</span>
              {!isTeaser && batch && open && (
                <span><span className="tiny-divider" /> 本期剩余 {remaining} 盒</span>
              )}
            </div>
          </div>

          <div className="hero-image-frame">
            <Image
              src="/brand/04.jpg"
              alt="掰开的巧克力豆曲奇，外缘脆、中心软"
              fill
              fetchPriority="high"
              sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 610px"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
            <div className="image-sticker">
              {isTeaser
                ? <><span>即将</span><strong>✦</strong><span>开张</span></>
                : <><span>每周</span><strong>1</strong><span>次烘焙</span></>}
            </div>
            <div className="hero-caption">
              <span>01 / 03</span>
              <span>夜里的巧克力，白天的茶</span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- 01 理念 */}
        <section className="zh-statement section-pad" id="why">
          <div className="section-index">01 <span>/</span> philosophy</div>
          <div className="statement-content">
            <div>
              <p className="eyebrow">不太甜，是一种分寸感</p>
              <h2>糖退到背景，<br /><span>味道才站得出来。</span></h2>
            </div>
            <div className="statement-right">
              <p>{t.pillars.items[0].d}</p>
              <p className="muted-note">小批量 · 手工整形 · Richmond 共享厨房烘焙</p>
              <a className="circle-link" href="#ritual" aria-label="了解更多"><ArrowUpRight size={19} /></a>
            </div>
          </div>
          <div className="ingredient-marquee" aria-hidden="true">
            <span>CHOCOLATE · TEA · BUTTER · TIME · </span>
            <span>CHOCOLATE · TEA · BUTTER · TIME · </span>
          </div>
        </section>

        {/* ---------------------------------------------------- 02 口味（预热期隐藏） */}
        {!isTeaser && (
        <section className="zh-flavours section-pad" id="lineup">
          <div className="section-heading-row">
            <div>
              <div className="section-index">02 <span>/</span> this bake</div>
              <h2>这一期，<br /><i>烤些什么？</i></h2>
            </div>
            <p>口味会轮换，心意不会。<br />每一炉都只做刚刚好的数量。</p>
          </div>

          <div className="flavour-grid">
            {shown.map((f, i) => (
              <article className={`flavour-card flavour-${i}`} key={f.id}>
                <div className="flavour-number">0{i + 1}</div>
                <div className="cookie-orb" style={{ background: ["#d7b25e", "#eeceb4", "#9e6e46"][i] }}>
                  <div className="cookie-inner" />
                  <span className="orb-spark">✦</span>
                </div>
                <div className="flavour-copy">
                  <h3>{f.name_zh}</h3>
                  <p>{f.name_en}</p>
                  <small>{f.desc_zh}</small>
                </div>
              </article>
            ))}
          </div>

          <div className="flavour-foot">
            <span>下一期口味由微信群投票决定</span>
            <Link href="/zh/order">看本期开单 <ArrowUpRight size={14} /></Link>
          </div>
        </section>
        )}

        {/* ---------------------------------------------------- 03 怎么买 */}
        <section className="zh-ritual" id="ritual">
          <div className="ritual-image">
            <div className="ritual-blob blob-a" />
            <div className="ritual-blob blob-b" />
            <div style={{ position: "relative", zIndex: 2 }}>
              <CatMarkLarge size={300} />
            </div>
          </div>
          <div className="ritual-copy section-pad">
            <div className="section-index">
              {isTeaser ? "02" : "03"} <span>/</span> {isTeaser ? "the craft" : "how it works"}
            </div>
            <h2>一盒曲奇，<br /><em>慢下来才好吃。</em></h2>
            <div className="ritual-steps">
              {(isTeaser ? CRAFT_STEPS : t.how.steps).map((s) => (
                <div key={s.n}>
                  <span>{s.n}</span>
                  <p><strong>{s.t}</strong><br />{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- 04 取货（预热期隐藏） */}
        {!isTeaser && (
        <section className="zh-pickup section-pad" id="pickup">
          <div className="pickup-left">
            <div className="section-index">04 <span>/</span> come by</div>
            <h2>在 Richmond，<br /><em>见一面吧。</em></h2>
            <p>
              固定开单日 · 固定自取日<br />
              {batch ? `${formatCents(effectivePrice(batch, product.variants[0]), "zh")} 起，` : ""}
              6 个及以上整售，不额外收税。
            </p>
          </div>
          <div className="pickup-cards">
            <div className="pickup-card">
              <MapPin size={18} />
              <span>自取</span>
              <strong>{batch?.pickup_address ?? "Richmond 取货点"}</strong>
              <small>{slotWindow}</small>
            </div>
            <div className="pickup-card">
              <Clock3 size={18} />
              <span>本期</span>
              <strong>{open ? `剩余 ${remaining} 盒` : "本期已满"}</strong>
              <small>{batch ? `共 ${batch.capacity_boxes} 盒 · 售完即止` : "开单后公布"}</small>
            </div>
            <div className="pickup-card pickup-card-dark">
              <Star size={18} />
              <span>B2B</span>
              <strong>企业礼盒定制</strong>
              <small>10 盒以上单独安排生产</small>
            </div>
          </div>
        </section>
        )}

        {/* ---------------------------------------------------- 预热期：留邮箱 */}
        {isTeaser && (
        <section className="zh-waitlist section-pad" id="notify">
          <div className="section-index">03 <span>/</span> stay in touch</div>
          <h2>开门那天，<br /><em>第一个告诉你。</em></h2>
          <p className="waitlist-lede">
            我们正在筹备，还在调配方、办证照、找厨房。
            留个邮箱，第一炉出炉前会通知你。不群发广告，只发这一封。
          </p>
          <Waitlist locale="zh" source="home-zh" />
        </section>
        )}
      </main>

      <Footer locale="zh" />
    </div>
  );
}
