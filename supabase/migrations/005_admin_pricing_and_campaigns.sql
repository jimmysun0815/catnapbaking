-- 005_admin_pricing_and_campaigns
-- 三件事：
--   1. 改价审计（谁、什么时候、从多少改到多少）
--   2. 候补名单的退订令牌（CASL 要求每封商业邮件带可用退订链接）
--   3. 邮件群发批次记录（防重复群发，留发送存证）

-- ---------------------------------------------------------------
-- 1. 改价审计
-- ---------------------------------------------------------------
create table public.price_changes (
  id           uuid primary key default gen_random_uuid(),
  variant_id   uuid not null references public.variants(id) on delete cascade,
  old_cents    int not null,
  new_cents    int not null,
  changed_by   uuid references auth.users(id),
  changed_at   timestamptz not null default now()
);

create index price_changes_variant_idx on public.price_changes (variant_id, changed_at desc);

alter table public.price_changes enable row level security;

create policy price_changes_admin_read on public.price_changes
  for select using (public.is_admin());

-- ---------------------------------------------------------------
-- 2. 退订令牌
-- ---------------------------------------------------------------
-- 退订链接不能带邮箱明文（会被转发、被爬），用不可猜测的随机令牌。
-- 存量行也要补上，否则老订阅者的退订链接发不出去。
alter table public.waitlist
  add column unsubscribe_token uuid not null default gen_random_uuid();

create unique index waitlist_unsub_token_idx on public.waitlist (unsubscribe_token);

-- ---------------------------------------------------------------
-- 3. 群发批次
-- ---------------------------------------------------------------
create table public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  body_md       text not null,               -- 正文原稿，纯文本/极简 markdown
  locale        text check (locale in ('zh','en')),   -- null = 两种语言都发
  status        text not null default 'draft'
                check (status in ('draft','sending','sent','failed')),
  recipient_count int not null default 0,
  sent_count      int not null default 0,
  failed_count    int not null default 0,
  error_text    text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

-- 每个收件人一行，防同一批次重复发送，也便于排查"谁没收到"
create table public.campaign_sends (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  waitlist_id uuid not null references public.waitlist(id) on delete cascade,
  email       text not null,
  status      text not null check (status in ('sent','failed')),
  error_text  text,
  sent_at     timestamptz not null default now(),
  unique (campaign_id, waitlist_id)
);

create index campaign_sends_campaign_idx on public.campaign_sends (campaign_id);

alter table public.campaigns enable row level security;
alter table public.campaign_sends enable row level security;

create policy campaigns_admin_read on public.campaigns
  for select using (public.is_admin());
create policy campaign_sends_admin_read on public.campaign_sends
  for select using (public.is_admin());
