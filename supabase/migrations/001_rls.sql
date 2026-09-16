-- 001_rls
-- 行级权限：顾客只能读到自己的资料和订单，目录数据公开可读。
-- 所有写操作走服务端 service_role key，绕过 RLS。

alter table public.profiles       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.products       enable row level security;
alter table public.variants       enable row level security;
alter table public.flavours       enable row level security;
alter table public.batches        enable row level security;
alter table public.pickup_slots   enable row level security;
alter table public.batch_flavours enable row level security;
alter table public.batch_prices   enable row level security;
alter table public.price_changes  enable row level security;
alter table public.payment_events enable row level security;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 顾客本人
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

create policy orders_select_own on public.orders
  for select using (profile_id = auth.uid() or public.is_admin());
create policy order_items_select_own on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.profile_id = auth.uid() or public.is_admin())
    )
  );

-- 目录数据所有人可读，前台要展示
create policy products_read on public.products       for select using (true);
create policy variants_read on public.variants       for select using (true);
create policy flavours_read on public.flavours       for select using (true);
create policy batches_read  on public.batches        for select using (true);
create policy slots_read    on public.pickup_slots   for select using (true);
create policy bf_read       on public.batch_flavours for select using (true);
create policy bp_read       on public.batch_prices   for select using (true);

-- 改价记录和支付事件只有后台能看
create policy price_changes_admin  on public.price_changes  for select using (public.is_admin());
create policy payment_events_admin on public.payment_events for select using (public.is_admin());
