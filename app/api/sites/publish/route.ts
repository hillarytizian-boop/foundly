import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { site_id, published } = await req.json();
  if (!site_id) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { data: site } = await supabase.from("sites").select("id,user_id,slug").eq("id", site_id).single();
  if (!site || site.user_id !== user.id) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  if (!site.slug) return NextResponse.json({ error: "This site has no slug — rebuild it with the agent team" }, { status: 400 });

  const next = published !== false;
  await supabase.from("sites").update({ published: next, published_url: next ? `/s/${site.slug}` : null }).eq("id", site_id);

  await supabase.from("activity").insert({
    user_id: user.id,
    message: next ? `Published /s/${site.slug}` : `Unpublished /s/${site.slug}`,
  });

  return NextResponse.json({ ok: true, published: next, url: next ? `/s/${site.slug}` : null });
}
