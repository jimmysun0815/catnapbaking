"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, AtSign } from "lucide-react";
import { en } from "@/lib/content";
import { Header, Footer, type NavUser } from "@/components/SiteChrome";
import { GiantCookie } from "@/components/CookieArt";
import { Waitlist } from "@/components/Waitlist";
import { isTeaser } from "@/lib/site-mode";
import type { Batch, Flavour, Product } from "@/lib/types";

const TONES = ["#ee7156", "#f3c67c", "#9c8bf2"];

/**
 * 英文首页 = 墨蓝夜色 + 珊瑚。
 * 主张是 Canadian-owned 和本地原料，不提减糖。
 * CFIA：可可、蔗糖、香草不产自加拿大，所以 .origin-note 那行不能删。
 */
export function HomeEn({
  batch, flavours, user = null,
}: { batch: Batch | null; product: Product; flavours: Flavour[]; user?: NavUser }) {
  const t = en;
  const remaining = batch ? Math.max(0, batch.capacity_boxes - batch.boxes_taken) : 0;
  const open = batch?.status === "open" && remaining > 0;

  const inBatch = flavours.filter((f) => batch?.flavour_ids.includes(f.id));
  const lineup = (inBatch.length ? inBatch : flavours).slice(0, 3);

  const [active, setActive] = useState(0);
  useEffect(() => {
    if (lineup.length < 2) return;
    const id = window.setInterval(() => setActive((v) => (v + 1) % lineup.length), 5200);
    return () => window.clearInterval(id);
  }, [lineup.length]);
  const current = lineup[active] ?? lineup[0];

  return (
    <div className="site en-site">
      <div className="en-noise" />
      <Header locale="en" anchors user={user} />

      <main>
        {/* ---------------------------------------------------- hero */}
        <section className="en-hero" id="story">
          <div className="en-hero-grid">
            <div className="en-hero-copy">
              <div className="en-eyebrow"><span className="live-dot" /> {t.hero.eyebrow}</div>
              <h1>Baked here,{"\n"}<span>with what grows here.</span></h1>
              <p>{t.hero.lead}</p>

              <div className="en-cta-row">
                {isTeaser ? (
                  <a href="#notify" className="order-button order-button-dark">
                    Tell me when you open
                    <ArrowUpRight size={16} strokeWidth={1.8} />
                  </a>
                ) : (
                  <Link href="/en/order" className="order-button order-button-dark">
                    {open ? t.hero.cta : t.hero.ctaClosed}
                    <ArrowUpRight size={16} strokeWidth={1.8} />
                  </Link>
                )}
                <a href="#story2" className="en-text-link">What goes in <ArrowUpRight size={16} /></a>
              </div>

              <div className="en-stamp">
                <span>CAT NAP</span>
                <strong>{isTeaser ? <>opening<br />soon</> : <>baked<br />in<br />richmond</>}</strong>
                <span>✦</span>
              </div>
            </div>

            <div className="en-hero-art">
              <GiantCookie />
              <div className="art-label label-top">THE<br />HOUSE<br />BATCH</div>
              <div className="art-label label-bottom">NO. 001<br /><span>CHOCOLATE</span></div>
            </div>
          </div>

          <div className="en-ticker">
            <span>CANADIAN BUTTER, FLOUR AND EGGS</span>
            <span>⋆</span>
            <span>RICHMOND, BC</span>
            <span>⋆</span>
            <span>BAKED WEEKLY</span>
            <span>⋆</span>
            <span>{isTeaser ? "OPENING SOON" : open ? `${remaining} BOXES LEFT` : "NEXT DROP SOON"}</span>
          </div>
        </section>

        {/* ---------------------------------------------------- 01 原料 */}
        <section className="en-manifesto" id="story2">
          <div className="en-section-kicker">01 / WHAT GOES IN</div>
          <div className="manifesto-main">
            <h2>Not a snack.<br /><i>A small reset.</i></h2>
            <div>
              {t.pillars.items.map((it) => (
                <p key={it.k}><strong>{it.k} — {it.v}.</strong> {it.d}</p>
              ))}
              {isTeaser
                ? <a className="underlined-link" href="#notify">Get the opening email <ArrowUpRight size={15} /></a>
                : <Link className="underlined-link" href="/en/order">See box options <ArrowUpRight size={15} /></Link>}
            </div>
          </div>
          {/* CFIA：不能宣称全部原料来自加拿大 */}
          <p className="origin-note">{t.pillars.footnote}</p>
          <div className="manifesto-asterisk" aria-hidden="true">✳</div>
        </section>

        {/* ---------------------------------------------------- 02 口味（预热期隐藏） */}
        {!isTeaser && (
        <section className="en-menu" id="menu">
          <div className="en-section-kicker">02 / THE CURRENT LINEUP</div>
          <div className="menu-intro">
            <h2>Pick your<br /><i>night mode.</i></h2>
            <p>Limited bake windows, because the best things should have a little anticipation.</p>
          </div>

          <div className="en-flavour-stage">
            <div className="en-flavour-visual" style={{ background: TONES[active % TONES.length] }}>
              <GiantCookie />
              <div className="visual-caption">
                {String(active + 1).padStart(2, "0")} <span>/ {String(lineup.length).padStart(2, "0")}</span>
              </div>
            </div>
            <div className="en-flavour-detail">
              <div className="flavour-tag">{batch ? "In this week's bake" : "On the roster"}</div>
              <h3>{current?.name_en}</h3>
              <p>{current?.desc_en}</p>
              <div className="menu-dots">
                {lineup.map((f, i) => (
                  <button
                    key={f.id}
                    className={active === i ? "selected" : ""}
                    onClick={() => setActive(i)}
                    aria-label={`Show ${f.name_en}`}
                  />
                ))}
              </div>
              <Link href="/en/order" className="underlined-link">See box options <ArrowUpRight size={15} /></Link>
            </div>
          </div>
        </section>
        )}

        {/* ---------------------------------------------------- 03 细节（预热期隐藏） */}
        {!isTeaser && (
        <section className="en-details" id="visit">
          <div className="details-card-main">
            <div className="en-section-kicker">03 / THE DETAILS</div>
            <h2>A little<br /><i>off-hours.</i></h2>
            <p>
              We bake on Saturdays and hand over boxes on Sundays around Richmond.
              Drop us a note if you are planning something bigger.
            </p>
            <div className="details-link-row">
              <a href="mailto:hello@catnapbaking.ca">hello@catnapbaking.ca</a>
              <a href="https://instagram.com/catnapbaking" target="_blank" rel="noreferrer">
                <AtSign size={17} /> @catnapbaking
              </a>
            </div>
          </div>
          <div className="details-side">
            <div className="mini-detail">
              <span>01</span><strong>Pickup</strong>
              <p>Sunday<br />2pm—5pm</p>
            </div>
            <div className="mini-detail">
              <span>02</span><strong>This drop</strong>
              <p>{open ? `${remaining} boxes` : "Sold out"}<br />of {batch?.capacity_boxes ?? "—"}</p>
            </div>
            <div className="mini-detail accent-mini">
              <span>03</span><strong>Gifting</strong>
              <p>Team boxes<br />welcome</p>
            </div>
          </div>
        </section>
        )}

        {/* ---------------------------------------------------- 预热期：留邮箱 */}
        {isTeaser && (
        <section className="en-waitlist" id="notify">
          <div className="en-section-kicker">02 / STAY IN TOUCH</div>
          <h2>We're not open<br /><i>just yet.</i></h2>
          <p className="waitlist-lede">
            Still testing recipes, sorting permits and finding a kitchen.
            Leave your email and we'll tell you before the first batch comes out of the oven.
            One email, nothing else.
          </p>
          <Waitlist locale="en" source="home-en" />
        </section>
        )}
      </main>

      <Footer locale="en" />
    </div>
  );
}
