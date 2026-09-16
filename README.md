# 不太甜研究所 / Cat Nap Baking Ltd.

Richmond BC 家庭曲奇店的网站与下单系统。方案见 `../docs/网站与下单系统方案.md`。

## 现在能跑

没配任何环境变量时，整站跑 `lib/seed.ts` 里的演示数据，前台后台都能点。
公司注册、Stripe 开户之前就可以先看效果、改文案、调设计。

```bash
npm install
npm run dev      # http://localhost:3000
```

| 页面 | 说明 |
|---|---|
| `/zh` `/en` | 两套独立设计的首页，不是互译 |
| `/zh/order` | 本期开单：规格、数量、自取时段、倒计时 |
| `/zh/login` | Google 登录 + 邮箱验证码 |
| `/zh/account` | 我的订单 |
| `/admin` | 看板：营收、手续费、渠道、支付方式、距保本 |
| `/admin/orders` | 订单列表 |
| `/admin/bake` | 烘焙清单，截单后照这张表烤 |
| `/admin/products` | 商品与价格 |

## 图片资源

`public/brand/cat-nap-mark-128.png`（导航、页脚）和 `-512.png`（流程段落大图）是品牌标志，
原始 1920px 图存在仓库根目录的 `assets/`，做包装和印刷时用那份。

**主视觉还是占位的。** `components/CookieArt.tsx` 里的 `<CookieStack />` 是用 CSS 画的曲奇，
换成实拍图只要改 `components/HomeZh.tsx` 里 `.hero-image-frame` 的这一行：

```tsx
<div className="hero-image-frame">
  <CookieStack />                          {/* 换成下面这行 */}
  <Image src="/brand/hero.jpg" alt="刚出炉的手工巧克力曲奇" fill style={{objectFit:"cover"}} />
```

外框的拱形、旋转贴纸和底部说明文字都不用动。口味卡里的 `.cookie-orb` 同理。

拍照建议：暖光、深色木质或米色台面，拍出断面的半流心。自己拍的图比图库图转化率高，
顾客能看出是不是同一家店做的。要用图库的话，Unsplash 和 Pexels 的授权允许商用，
搜 `chocolate chip cookie stack` 或 `cookies on parchment`。

## 技术栈

Next.js 16（App Router）· Supabase（Postgres + Auth + RLS）· Stripe Checkout · Resend · 部署 Vercel。

## 数据库工作流

migration 全部放在 `supabase/migrations/`，**用三位数字编号，从 `000` 开始**，
一个改动一个文件，只追加不改已推送过的文件。

```
000_init_schema.sql     表、视图、注册触发器
001_rls.sql             行级权限
002_seed_catalogue.sql  初始目录数据（口味、商品、规格）
```

配完环境变量后打开 <http://localhost:3000/api/health> 自检，
会报告有没有连上、各表几行、有没有开放的批次。

首次连接：

```bash
npx supabase login
npx supabase link --project-ref <你的 project ref>   # 在项目 Settings → General 里
npx supabase db push
```

以后每次改数据库：

```bash
# 新建文件，编号接着上一个往后排，例如 003_add_delivery.sql
npx supabase db push          # 只推还没执行过的
npx supabase migration list   # 看本地和远端的差异
```

> `supabase migration new xxx` 生成的是 14 位时间戳文件名。要保持编号统一的话，
> 生成后手动改成下一个三位编号。时间戳文件排在三位编号之后，混用不会乱序，
> 但统一编号更好读。

**注意：** 三位编号是否被 CLI 完全接受，我没法在本地脱离数据库验证。
第一次 `db push` 如果报文件名相关的错，把文件改成
`20260910120000_init_schema.sql` 这种时间戳格式即可，内容不用动。

推完之后到后台 `/admin/batches` 建第一个批次，前台才会显示开单。

## 进后台

后台地址 `/admin`。只有 `profiles.is_admin = true` 的登录用户能进，
其他人跳登录页；管理接口未授权返回 403。

后台页面用的是 `serviceClient`，它绕过行级权限，
所以数据库那层的 RLS 在这里保护不到，必须在进页面前拦住。守卫在 `lib/admin-guard.ts`。

**第一次开通，顺序不能反：**

1. 先在网站上用你的邮箱登录一次（`/zh/login?next=/admin`），
   这一步会在 `profiles` 里建出你的行
2. 在 Supabase SQL Editor 执行（`004_admin_bootstrap.sql` 里有现成的）：

```sql
update public.profiles set is_admin = true
where lower(email) = '你的邮箱';
```

3. 回到 `/admin` 刷新

没登录过就执行第 2 步不会报错，但也不会生效，因为那时还没有你的行。

以后加管理员，直接在 Supabase 后台把那个人的 `is_admin` 勾上即可。
预热期顾客登录入口是关的，但 `/login?next=/admin` 这条路留着，否则管理员进不去。

## 两个版本：预热 / 开业

同一套代码，靠一个环境变量切换，不开分支，避免两个版本各自漂移。

```
NEXT_PUBLIC_SITE_MODE=teaser   # 预热期（现在）
NEXT_PUBLIC_SITE_MODE=live     # 开业后
```

**预热期隐藏的东西：** 本期剩余数量、开单倒计时、口味卡、取货时段、
自取地点、下单和登录入口，以及页面元描述里的运营信息。
`/order`、`/pay`、`/account`、`/login` 一律重定向回首页，
`/api/checkout` 和 `/api/mock-pay` 直接返回 404，光挡页面不挡接口等于没挡。

**预热期保留的：** 品牌故事、减糖主张（连同法定的参照说明）、原料、手艺三步，
以及页面底部的邮箱候补名单。

**开业当天**把变量改成 `live` 重新部署，上面那些自动全部回来，代码不用动。
不设变量时默认 `live`，免得哪天忘了配就悄悄把店关着。

候补名单在后台 `/admin/waitlist` 看，能按语言和来源分类，开业时照着群发。
每条都存了留邮箱时页面上的同意文案原文，这是加拿大反垃圾邮件法要的证据，
群发时每封必须带退订链接。

## 登录

两种方式，都不设密码：Google 账号，或邮箱收 6 位验证码。
**下单必须先登录**，否则收据和取货提醒发不到人。

### Google OAuth 配置

**1. Google Cloud 建客户端** <https://console.cloud.google.com/auth/clients>

- 同意屏幕：Audience 选 External，scope 加 `openid`、`userinfo.email`、`userinfo.profile`，
  Branding 填店名和 logo（顾客授权时会看到）
- 客户端类型选 **Web application**
- Authorized JavaScript origins：`http://localhost:3000` 和正式域名
- Authorized redirect URIs 填 **Supabase 的地址**，不是本站地址：

```
https://<project-ref>.supabase.co/auth/v1/callback
```

**2. Supabase 后台** Authentication → Providers → Google
打开开关，粘贴 Google 给的 Client ID 和 Client Secret。

**3. Supabase 后台** Authentication → URL Configuration

- Site URL：`http://localhost:3000`（上线后改成正式域名）
- Redirect URLs 加 `http://localhost:3000/**` 和 `https://正式域名/**`

不配这一步，登录完会跳到错误页。

> 同意屏幕停在 Testing 状态时，只有加进测试名单的账号能登录。正式开卖前记得 Publish。

### 邮箱验证码

Authentication → Emails 里把 Magic Link 模板改成发验证码：
模板里用 `{{ .Token }}` 而不是 `{{ .ConfirmationURL }}`，顾客收到的就是 6 位数字。

**上线前必须换掉发信服务。** Supabase 自带的邮件每小时只有几封额度，
开单当天顾客会登录不了。Authentication → SMTP Settings 里填 Resend 的 SMTP。

### 代码里的分工

| 文件 | 职责 |
|---|---|
| `lib/supabase/server.ts` | 服务端读登录态，受行级权限约束 |
| `lib/supabase/client.ts` | 浏览器端登录，会话写进 cookie |
| `lib/supabase.ts` | `serviceClient()` 绕过行级权限，只在服务端写入时用 |
| `middleware.ts` | 续期 token，不做这件事服务端会随机读到未登录 |
| `app/auth/callback` | Google 跳回来后换会话 |

## 支付：现在是占位

Stripe 还没开户，所以结账后进的是模拟支付页 `/{locale}/pay/{订单号}`，
上面有「模拟支付成功」和「模拟支付失败」两个按钮。

两个按钮走的是和真实支付**完全相同**的状态流转（都在 `lib/orders.ts`）：
成功会把订单标记已付款、锁定名额、发出收据；失败会释放名额。

**配上 `STRIPE_SECRET_KEY` 之后：**
- 结账接口自动改为跳转 Stripe，不用改代码
- `/api/mock-pay` 立即返回 404，线上不可能手动点成功
- `/{locale}/pay/...` 自动重定向回下单页
- 删掉 `components/MockPay.tsx`、`app/[locale]/pay/`、`app/api/mock-pay/` 和
  `globals.css` 里标注的那一段即可清理干净

## 上线步骤

1. **建 Supabase 项目**，区域选 us-west（俄勒冈），离温哥华最近。
   在 SQL Editor 执行 `supabase/migrations/0001_init.sql`。
2. **Supabase → Authentication**
   - 开启 Google provider，在 Google Cloud 建 OAuth 客户端
   - 开启 Email OTP
   - **把 SMTP 换成 Resend**。自带邮件服务每小时只有几封额度，开单当天顾客会登录不了
3. **Stripe**：公司注册 + 银行开户后开正式账户；之前用 test 密钥开发。
   - 在后台单独申请开通**微信支付**和**支付宝**
   - 还没批下来时把 `STRIPE_WALLETS` 留空，结账页只显示信用卡
   - **关掉 Stripe 自带的收据邮件**，我们自己发品牌收据，避免顾客收两封
   - Webhook 端点填 `https://你的域名/api/webhooks/stripe`，监听：
     `checkout.session.completed`、`checkout.session.expired`、`charge.refunded`
4. **复制 `.env.example` 为 `.env.local`** 填好。
5. **部署 Vercel**，环境变量同上，`vercel.json` 里的 cron 会自动生效。

> Vercel Hobby 条款是个人非商业用途。开发阶段没问题，**正式开卖前升 Pro**。
> 升级后 cron 精度也从 ±59 分钟变成精确到分。

## 两个设计上的关键决定

**库存释放不用 cron。** 结账时锁 30 分钟名额，到点由 Stripe 推送
`checkout.session.expired` 事件释放。事件驱动比轮询准，也让我们的定时任务
全部落在每天/每周级别，Vercel Hobby 的额度就够。

**订单存价格快照。** `order_items.unit_price_cents` 记录下单当时的价格。
后台改价只影响新订单，历史订单和历史报表不受影响。没有这一条，
改一次价过去几个月的营收数据就全乱了。

## 文案合规（CFIA，别随便改）

- **「减糖 70%」** 是比较型营养声明，必须与参照说明同屏：
  「相比我们的经典配方，每块含糖 X g」。参照物用自己的经典配方最稳。
  文案在 `lib/content.ts` 的 `claimFootnote`，**删掉它就违规了**。
- 试配方时要记录两版配方每块的**糖克数和热量**，填进去替换占位数字。
- **不用「健康」定性**含黄油巧克力的曲奇，用「更少负担」「清爽不腻」这类表述。
- 英文**不能说全部原料来自加拿大**（可可、蔗糖、香草不产自加拿大），
  只点名黄油、面粉、鸡蛋，脚注写 domestic and imported ingredients。
- 一旦做营养声明，包装**必须印 Nutrition Facts**，一次性成本 $100–600。

## 待办

- [ ] 后台改价、批次管理的写入表单（现在是只读展示）
- [ ] 取货核销扫码
- [ ] 手动录单（微信群 / 企业礼盒 / e-Transfer）
- [ ] 月报 CSV 附件发邮件（逻辑已在 `/api/cron/monthly-report`，待接 Resend 附件）
- [ ] 隐私政策页（BC PIPA / PIPEDA 要求）
- [ ] 确认自取地点：共享厨房是否允许顾客到场取货
