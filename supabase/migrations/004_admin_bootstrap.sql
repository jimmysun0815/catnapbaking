-- 004_admin_bootstrap
-- 把自己设成管理员。
--
-- 顺序很重要：必须先用这个邮箱在网站上登录过一次，
-- auth.users 和 profiles 里才会有对应的行，这条语句才生效。
--
-- 把下面的邮箱换成你们两个人的，然后执行。
-- 以后要加管理员，直接在 Supabase 后台改 profiles.is_admin 即可。

update public.profiles
set is_admin = true
where lower(email) in (
  'jimmysun123@gmail.com'
  -- , '合伙人的邮箱@example.com'
);
