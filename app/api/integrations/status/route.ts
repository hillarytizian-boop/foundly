import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/tokens";
import { PROVIDERS, isConfigured } from "@/lib/integrations";
import { guideFor } from "@/lib/connect-guides";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const admin = adminClient();
  const [{ data: tokens }, { data: rows }] = await Promise.all([
    admin.from("integration_tokens").select("slug,account_label,expires_at").eq("user_id", user.id),
    supabase.from("integrations").select("slug,status"),
  ]);

  const tokenMap = new Map((tokens ?? []).map((t: any) => [t.slug, t]));
  const rowMap = new Map((rows ?? []).map((r: any) => [r.slug, r.status]));

  const providers = PROVIDERS.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    canPost: p.canPost ?? null,
    configured: isConfigured(p),
    connected: tokenMap.has(p.slug) || rowMap.get(p.slug) === "connected",
    viaOAuth: tokenMap.has(p.slug),
    account: (tokenMap.get(p.slug)?.account_label as string) ?? null,
    expiresAt: (tokenMap.get(p.slug)?.expires_at as string) ?? null,
    docs: p.docs,
    guide: guideFor(p.slug) ?? null,
    /** provider accepts a token you already hold, verified before saving */
    tokenConnect: ["x", "linkedin", "facebook", "instagram", "tiktok", "slack", "gmail"].includes(p.slug),
    envKeys: p.envKeys.id ? [p.envKeys.id, p.envKeys.secret] : [],
  }));

  return NextResponse.json({ providers, connectedCount: providers.filter((p) => p.connected).length });
}
