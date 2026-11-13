import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/tokens";

export async function POST(req: Request) {
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const admin = adminClient();
  await admin.from("integration_tokens").delete().eq("user_id", user.id).eq("slug", slug);
  await supabase.from("integrations").delete().eq("user_id", user.id).eq("slug", slug);

  return NextResponse.json({ ok: true });
}
