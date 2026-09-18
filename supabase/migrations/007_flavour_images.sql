-- 007_flavour_images
-- 口味配图。
--
-- 写成数据而不是代码里的 slug 映射：口味每期轮换，换一次就要改一次代码
-- 不现实。没有配图的口味回退到原来的 CSS 画的曲奇图形，不会开天窗。

alter table public.flavours
  add column if not exists image_url text;

update public.flavours set image_url = '/brand/04.jpg'
  where slug = 'classic-chocolate-chip';

update public.flavours set image_url = '/brand/wulong.webp'
  where slug = 'osmanthus-oolong';

-- 黑芝麻暂时下架。用 active=false 而不是 delete：
-- order_items.flavour_id 是无级联外键，硬删会破坏历史订单的口味记录。
update public.flavours set active = false
  where slug = 'black-sesame';
