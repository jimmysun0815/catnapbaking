-- 002_seed_catalogue
-- 初始目录数据。用固定 UUID，可重复执行不会产生重复行。
-- 批次和时段不放在这里，那是日常运营数据，从后台建。

insert into public.flavours (id, slug, name_zh, name_en, desc_zh, desc_en, sort_order) values
  ('11111111-0000-4000-8000-000000000001', 'classic-chocolate-chip', '经典巧克力曲奇', 'Classic Chocolate Chip',
   '比利时黑巧克力，海盐收尾。外缘脆，中心软。',
   'Belgian dark chocolate, finished with sea salt. Crisp edges, soft centre.', 1),
  ('11111111-0000-4000-8000-000000000002', 'black-sesame', '黑芝麻', 'Black Sesame',
   '现磨黑芝麻酱，烘香浓，回口不腻。',
   'Stone-ground black sesame paste, deeply toasted.', 2),
  ('11111111-0000-4000-8000-000000000003', 'osmanthus-oolong', '桂花乌龙', 'Osmanthus Oolong',
   '乌龙茶粉配干桂花，茶香清淡。',
   'Oolong tea powder with dried osmanthus blossom.', 3)
on conflict (id) do nothing;

insert into public.products (id, slug, name_zh, name_en, desc_zh, desc_en, flavour_mode, sort_order) values
  ('22222222-0000-4000-8000-000000000001', 'cookies', '手工曲奇', 'Handmade Cookies',
   '每周现烤，小批量制作。', 'Baked fresh once a week, in small batches.',
   'none', 1)   -- 初期单一产品，后台可改成 single 或 mix
on conflict (id) do nothing;

insert into public.variants (id, product_id, sku, name_zh, name_en, cookie_count, price_cents, sort_order) values
  ('33333333-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001',
   'CN-BOX-6',    '6 个装',    'Box of 6',        6,  2600, 1),
  ('33333333-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001',
   'CN-GIFT-12',  '12 个礼盒', 'Gift Box of 12', 12,  4600, 2)
on conflict (id) do nothing;
