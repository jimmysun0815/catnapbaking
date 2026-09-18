-- 005_admin_pricing_and_campaigns
-- 两件事：
--   1. 候补名单的退订令牌（CASL 要求每封商业邮件带可用退订链接）
--   2. 邮件群发批次记录（防重复群发，留发送存证）
--
-- 注意：改价审计表 price_changes 早在 000_init_schema 就建好了
-- （列名是 old_price_cents / new_price_cents，changed_by 指向 profiles），
-- 001_rls 也配好了 RLS 与只读策略，这里不重复建，只补一条查询索引。

-- ---------------------------------------------------------------
-- 1. 改价审计：按规格查历史时要走索引
-- ---------------------------------------------------------------
create index if not exists price_changes_variant_idx
  on public.price_changes (variant_id, changed_at desc);

-- ---------------------------------------------------------------
-- 2. 退订令牌
-- ---------------------------------------------------------------
-- 退订链接不能带邮箱明文（会被转发、被爬），用不可猜测的随机令牌。
-- 存量行由 default 自动补上，否则老订阅者的退订链接发不出去。
alter table public.waitlist
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists waitlist_unsub_token_idx
  on public.waitlist (unsubscribe_token);

-- ---------------------------------------------------------------
-- 3. 群发批次
-- ---------------------------------------------------------------
create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  body_md         text not null,               -- 正文原稿，纯文本/极简 markdown
  locale          text check (locale in ('zh','en')),   -- null = 两种语言都发
  status          text not null default 'draft'
                  check (status in ('draft','sending','sent','failed')),
  recipient_count int not null default 0,
  sent_count      int not null default 0,
  failed_count    int not null default 0,
  error_text      text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

-- 每个收件人一行，防同一批次重复发送，也便于排查「谁没收到」
create table if not exists public.campaign_sends (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  waitlist_id uuid not null references public.waitlist(id) on delete cascade,
  email       text not null,
  status      text not null check (status in ('sent','failed')),
  error_text  text,
  sent_at     timestamptz not null default now(),
  unique (campaign_id, waitlist_id)
);

create index if not exists campaign_sends_campaign_idx
  on public.campaign_sends (campaign_id);

alter table public.campaigns      enable row level security;
alter table public.campaign_sends enable row level security;

-- 只有后台能看。写入走服务端 service key，绕过 RLS
drop policy if exists campaigns_admin_read on public.campaigns;
create policy campaigns_admin_read on public.campaigns
  for select using (public.is_admin());

drop policy if exists campaign_sends_admin_read on public.campaign_sends;
create policy campaign_sends_admin_read on public.campaign_sends
  for select using (public.is_admin());
