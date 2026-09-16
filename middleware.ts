import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 刷新登录态。Supabase 的 token 会过期，
 * 不在这里续期的话，服务端组件随时可能读到「未登录」。
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!url || !publishableKey) return res;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  // 必须调用，否则 token 不会续期
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: [
    // 静态资源和图片不用过
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
