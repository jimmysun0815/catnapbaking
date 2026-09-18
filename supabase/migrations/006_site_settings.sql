-- 006_site_settings
-- 站点模式从环境变量搬到数据库，后台才能实时切换。
--
-- 原来靠 NEXT_PUBLIC_SITE_MODE，但它是构建期内联的：改了要重新部署才生效，
-- 后台按钮点了也不会有任何变化。搬到库里之后环境变量退化为兜底值
-- （数据库读不到时用它，仍然保留「不设则 live」的语义）。

create table if not exists public.site_settings (
  -- 单行表：加约束防止出现第二行，否则读的时候要纠结读哪条
  id         int primary key default 1 check (id = 1),
  mode       text not null default 'live' check (mode in ('teaser','live')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- 初始值取当前线上实际状态：预热期
insert into public.site_settings (id, mode)
values (1, 'teaser')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

-- 模式本身不是秘密（前台页面本来就体现得出来），但只有后台能改。
-- 写入一律走服务端 service key，绕过 RLS。
drop policy if exists site_settings_admin_read on public.site_settings;
create policy site_settings_admin_read on public.site_settings
  for select using (public.is_admin());
