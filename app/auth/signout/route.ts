import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = await serverClient();
  await sb?.auth.signOut();
  const { origin } = new URL(req.url);
  return NextResponse.redirect(`${origin}/zh`, { status: 303 });
}
