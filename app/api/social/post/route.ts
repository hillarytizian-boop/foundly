import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient, getToken } from "@/lib/tokens";
import { publishTo } from "@/lib/social";

export async function POST(req: Request) {
  const { slug, body, pageId, igUserId, imageUrl, channel, to } = await req.json();
  if (!slug || !body?.trim()) return NextResponse.json({ error: "slug and body are required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const tokenRow = await getToken(user.id, slug);
  if (!tokenRow?.access_token) {
    return NextResponse.json({
      error: `You haven't connected ${slug} yet. Connect it in Integrations, then try again.`,
      needs_connect: slug,
    }, { status: 400 });
  }

  const admin = adminClient();
  const { data: log } = await admin.from("social_publications").insert({
    user_id: user.id, slug, body, status: "pending",
  }).select().single();

  const result = await publishTo(slug, tokenRow.access_token, body, { pageId, igUserId, imageUrl, channel, to });

  await admin.from("social_publications").update({
    status: result.ok ? "sent" : "failed",
    external_id: result.externalId ?? null,
    external_url: result.url ?? null,
    error: result.error ?? null,
  }).eq("id", log!.id);

  await supabase.from("activity").insert({
    user_id: user.id,
    message: result.ok ? `Published to ${slug}` : `Publish to ${slug} failed: ${result.error}`,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, url: result.url, external_id: result.externalId });
}
