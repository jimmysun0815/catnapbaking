-- 003_waitlist
-- 预热期的邮箱候补名单。开业后群发通知用。
-- CASL（加拿大反垃圾邮件法）要求商业邮件有明示同意，
-- 所以这里连同意时间和当时展示的同意文案一起存证。

create table public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  locale       text not null default 'zh' check (locale in ('zh','en')),
  source       text,                       -- 从哪个页面留的，便于看渠道效果
  consent_text text not null,              -- 留邮箱时页面上写的原话，存证用
  consented_at timestamptz not null default now(),
  notified_at  timestamptz,                -- 开业通知发出时间，防重复群发
  unsubscribed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- 同一个邮箱只留一条，重复提交视为已在名单里
create unique index waitlist_email_idx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- 只有后台能看名单。写入走服务端 service key，绕过 RLS
create policy waitlist_admin_read on public.waitlist
  for select using (public.is_admin());
