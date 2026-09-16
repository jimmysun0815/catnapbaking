-- 000_init_schema
-- 不太甜研究所 / Cat Nap Baking Ltd. 初始 schema
-- 金额一律以「分」存储，避免浮点误差。

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- 顾客资料
-- auth.users 由 Supabase Auth 管理，这里只存业务字段
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null,
  full_name        text,
  phone            text,
  wechat_id        text,
  locale           text not null default 'zh' check (locale in ('zh','en')),
  marketing_opt_in boolean not null default false,   -- CASL 要求明示同意
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- 商品与价格
create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  name_zh              text not null,
  name_en              text not null,
  desc_zh              text,
  desc_en              text,
  -- 口味选择模式：none 单一产品 / single 每盒选一种 / mix 可混装
  flavour_mode         text not null default 'none' check (flavour_mode in ('none','single','mix')),
  max_flavours_per_box int,
  active               boolean not null default true,
  sort_order           int not null default 0,
  created_at           timestamptz not null default now()
);

-- 规格 = 可售单位（6 个装 / 12 个礼盒）。价格在这里，后台可改
create table public.variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  sku          text unique not null,
  name_zh      text not null,
  name_en      text not null,
  cookie_count int not null,                            -- 每盒几块，决定烘焙量
  price_cents  int not null check (price_cents >= 0),   -- $26.00 = 2600
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- 改价留痕：谁在什么时候把哪个规格从多少改成多少
create table public.price_changes (
  id              uuid primary key default gen_random_uuid(),
  variant_id      uuid not null references public.variants(id) on delete cascade,
  old_price_cents int not null,
  new_price_cents int not null,
  changed_by      uuid references public.profiles(id),
  changed_at      timestamptz not null default now(),
  note            text
);

create table public.flavours (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name_zh    text not null,
  name_en    text not null,
  desc_zh    text,
  desc_en    text,
  active     boolean not null default true,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------- 批次
create table public.batches (
  id             uuid primary key default gen_random_uuid(),
  name_zh        text not null,
  name_en        text not null,
  status         text not null default 'draft'
                 check (status in ('draft','open','closed','completed','cancelled')),
  opens_at       timestamptz not null,
  closes_at      timestamptz not null,
  bake_date      date,
  capacity_boxes int not null check (capacity_boxes > 0),
  pickup_address text not null,
  pickup_note_zh text,
  pickup_note_en text,
  created_at     timestamptz not null default now(),
  constraint batch_window check (closes_at > opens_at)
);

create table public.batch_flavours (
  batch_id    uuid not null references public.batches(id) on delete cascade,
  flavour_id  uuid not null references public.flavours(id) on delete cascade,
  max_cookies int,
  primary key (batch_id, flavour_id)
);

-- 批次专属价：某期做活动只改这期，留空则用 variants.price_cents
create table public.batch_prices (
  batch_id    uuid not null references public.batches(id) on delete cascade,
  variant_id  uuid not null references public.variants(id) on delete cascade,
  price_cents int not null check (price_cents >= 0),
  primary key (batch_id, variant_id)
);

create table public.pickup_slots (
  id         uuid primary key default gen_random_uuid(),
  batch_id   uuid not null references public.batches(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  max_orders int not null check (max_orders > 0),
  constraint slot_window check (ends_at > starts_at)
);

-- ---------------------------------------------------------------- 订单
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text unique not null,
  batch_id      uuid not null references public.batches(id),
  profile_id    uuid references public.profiles(id),
  slot_id       uuid references public.pickup_slots(id),

  -- 下单时填写，与 profile 分开存，顾客改资料不影响历史订单
  contact_name  text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  wechat_id     text,
  gift_message  text,

  status  text not null default 'pending'
          check (status in ('pending','paid','packed','picked_up','no_show','refunded','expired','cancelled')),
  channel text not null default 'web'
          check (channel in ('web','wechat','b2b','platform')),

  -- 金额快照，改价不影响历史订单与历史报表
  subtotal_cents int not null default 0,
  total_cents    int not null default 0,
  fee_cents      int not null default 0,
  currency       text not null default 'cad',
  -- 6 块及以上整售为 GST 零税率
  gst_zero_rated boolean not null default true,

  payment_method        text,   -- card / wechat_pay / alipay / etransfer / cash / mock
  payment_ref           text,   -- Stripe session id，或模拟支付的标记
  payment_intent_ref    text,

  -- 名额锁定到期时间。接入 Stripe 后与 session expires_at 对齐
  expires_at   timestamptz,
  paid_at      timestamptz,
  picked_up_at timestamptz,
  admin_note   text,
  created_at   timestamptz not null default now()
);

create unique index orders_payment_ref_idx on public.orders(payment_ref) where payment_ref is not null;
create index orders_batch_status_idx on public.orders(batch_id, status);
create index orders_profile_idx on public.orders(profile_id);
create index orders_expiry_idx on public.orders(expires_at) where status = 'pending';

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  variant_id       uuid not null references public.variants(id),
  flavour_id       uuid references public.flavours(id),
  quantity         int not null check (quantity > 0),
  unit_price_cents int not null,          -- 下单当时的价格快照
  variant_name_zh  text not null,
  variant_name_en  text not null,
  cookie_count     int not null
);

create index order_items_order_idx on public.order_items(order_id);

-- 支付回调幂等表。现在给模拟支付用，接入 Stripe 后存 event id
create table public.payment_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- 已占产能
-- 已付款的订单，加上仍在锁定窗口内的未付款订单，共同占用批次产能
create view public.batch_usage as
select
  b.id as batch_id,
  b.capacity_boxes,
  coalesce(sum(oi.quantity) filter (
    where o.status in ('paid','packed','picked_up','no_show')
       or (o.status = 'pending' and o.expires_at > now())
  ), 0)::int as boxes_taken
from public.batches b
left join public.orders o on o.batch_id = b.id
left join public.order_items oi on oi.order_id = o.id
group by b.id, b.capacity_boxes;

-- ---------------------------------------------------------------- 注册即建 profile
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
