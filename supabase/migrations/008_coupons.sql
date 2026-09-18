-- 008_coupons
-- 优惠券。
--
-- 两个关键决定：
--   1. 校验与核销放在 Postgres 函数里，时间基准用数据库的 now()。
--      Node 进程的时钟和数据库可能有漂移，过期判断必须以一处为准，
--      否则「刚好过期」的券会出现前端说能用、写库时又失败的情况。
--   2. 核销时对券行 for update 加锁。否则最后一张名额会被并发的两单同时抢到，
--      redeemed_count 超过 max_redemptions。

create table if not exists public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null,
  kind               text not null check (kind in ('percent','amount')),
  percent_off        int  check (percent_off between 1 and 100),
  amount_off_cents   int  check (amount_off_cents > 0),
  -- 最低消费门槛，0 表示不限
  min_subtotal_cents int  not null default 0 check (min_subtotal_cents >= 0),
  -- null = 不限次数
  max_redemptions    int  check (max_redemptions > 0),
  redeemed_count     int  not null default 0 check (redeemed_count >= 0),
  starts_at          timestamptz,
  expires_at         timestamptz,
  -- 手动停用。过期是时间决定的，停用是人决定的，两件事分开记
  active             boolean not null default true,
  note               text,
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now(),

  -- 折扣方式与对应字段必须配套，不允许建出「百分比券但没填百分比」这种行
  constraint coupons_value_ck check (
    (kind = 'percent' and percent_off is not null and amount_off_cents is null) or
    (kind = 'amount'  and amount_off_cents is not null and percent_off is null)
  )
);

-- 券码不区分大小写：顾客不会照着大小写输
create unique index if not exists coupons_code_idx on public.coupons (upper(code));

create table if not exists public.coupon_redemptions (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references public.coupons(id) on delete cascade,
  order_id       uuid not null references public.orders(id) on delete cascade,
  discount_cents int  not null check (discount_cents >= 0),
  redeemed_at    timestamptz not null default now(),
  -- 每单只能用一张券，在库层兜住，不依赖应用层记得检查
  unique (order_id)
);

create index if not exists coupon_redemptions_coupon_idx
  on public.coupon_redemptions (coupon_id, redeemed_at desc);

alter table public.orders
  add column if not exists coupon_id uuid references public.coupons(id),
  add column if not exists discount_cents int not null default 0 check (discount_cents >= 0);

-- ---------------------------------------------------------------
-- 折扣金额。集中一处，预览和核销不会算出两个结果
-- ---------------------------------------------------------------
create or replace function public.coupon_discount(c public.coupons, p_subtotal_cents int)
returns int language sql immutable as $$
  select least(
    case when c.kind = 'percent'
         then (p_subtotal_cents * c.percent_off) / 100      -- 整数除法，向下取整
         else c.amount_off_cents
    end,
    p_subtotal_cents                                         -- 折扣不能超过订单金额
  );
$$;

-- ---------------------------------------------------------------
-- 只读预览：下单页输入券码时实时校验，不写任何东西
-- ---------------------------------------------------------------
create or replace function public.coupon_preview(p_code text, p_subtotal_cents int)
returns table (ok boolean, reason text, coupon_id uuid, discount_cents int)
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  select * into c from public.coupons where upper(code) = upper(trim(p_code));

  if c.id is null              then return query select false, 'not_found', null::uuid, 0; return; end if;
  if not c.active              then return query select false, 'inactive',  null::uuid, 0; return; end if;
  if c.starts_at is not null and now() < c.starts_at
                               then return query select false, 'not_started', null::uuid, 0; return; end if;
  if c.expires_at is not null and now() >= c.expires_at
                               then return query select false, 'expired',   null::uuid, 0; return; end if;
  if c.max_redemptions is not null and c.redeemed_count >= c.max_redemptions
                               then return query select false, 'used_up',   null::uuid, 0; return; end if;
  if p_subtotal_cents < c.min_subtotal_cents
                               then return query select false, 'below_min', null::uuid, 0; return; end if;

  return query select true, 'ok', c.id, public.coupon_discount(c, p_subtotal_cents);
end;
$$;

-- ---------------------------------------------------------------
-- 核销：加锁 + 再校验一次 + 写核销记录 + 计数加一，全在一个事务里
-- ---------------------------------------------------------------
create or replace function public.coupon_redeem(
  p_code text, p_order_id uuid, p_subtotal_cents int
)
returns table (ok boolean, reason text, coupon_id uuid, discount_cents int)
language plpgsql volatile security definer set search_path = public as $$
declare
  c public.coupons;
  d int;
begin
  -- for update：并发下单时排队，防止最后一张名额被两单同时拿走
  select * into c from public.coupons
    where upper(code) = upper(trim(p_code)) for update;

  if c.id is null              then return query select false, 'not_found', null::uuid, 0; return; end if;
  if not c.active              then return query select false, 'inactive',  null::uuid, 0; return; end if;
  if c.starts_at is not null and now() < c.starts_at
                               then return query select false, 'not_started', null::uuid, 0; return; end if;
  if c.expires_at is not null and now() >= c.expires_at
                               then return query select false, 'expired',   null::uuid, 0; return; end if;
  if c.max_redemptions is not null and c.redeemed_count >= c.max_redemptions
                               then return query select false, 'used_up',   null::uuid, 0; return; end if;
  if p_subtotal_cents < c.min_subtotal_cents
                               then return query select false, 'below_min', null::uuid, 0; return; end if;

  d := public.coupon_discount(c, p_subtotal_cents);

  begin
    insert into public.coupon_redemptions (coupon_id, order_id, discount_cents)
    values (c.id, p_order_id, d);
  exception when unique_violation then
    -- unique(order_id) 撞了：这一单已经用过券
    return query select false, 'order_already_has_coupon', null::uuid, 0; return;
  end;

  update public.coupons set redeemed_count = redeemed_count + 1 where id = c.id;
  update public.orders
     set coupon_id = c.id, discount_cents = d, total_cents = greatest(subtotal_cents - d, 0)
   where id = p_order_id;

  return query select true, 'ok', c.id, d;
end;
$$;

-- ---------------------------------------------------------------
-- 权限：函数走 security definer，前台匿名用户只被允许调预览。
-- 核销只在服务端用 service key 调，不对外开放。
-- ---------------------------------------------------------------
revoke all on function public.coupon_redeem(text, uuid, int) from public, anon, authenticated;
grant execute on function public.coupon_preview(text, int) to anon, authenticated;

alter table public.coupons            enable row level security;
alter table public.coupon_redemptions enable row level security;

drop policy if exists coupons_admin_read on public.coupons;
create policy coupons_admin_read on public.coupons
  for select using (public.is_admin());

drop policy if exists coupon_redemptions_admin_read on public.coupon_redemptions;
create policy coupon_redemptions_admin_read on public.coupon_redemptions
  for select using (public.is_admin());
