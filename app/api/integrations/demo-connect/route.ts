import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/tokens";
import { getProvider, isConfigured } from "@/lib/integrations";

/**
 * Demo-mode connections.
 *
 * Why this exists: 19 providers are listed and none of them have app
 * credentials on this deployment, so a normal OAuth link dead-ends on the
 * provider's side. Rather than let users hit a wall — or, worse, pretend a
 * connection happened — the demo route records exactly what it is.
 *
 * Non-negotiables:
 *   - the row carries mode='demo', and /workspace/integrations shows that badge
 *   - no token is written, so nothing can ever be published through it
 *   - it REFUSES any provider that could connect for real. A demo must never
 *     shadow a working path, otherwise it becomes a lie.
 */
export async function POST(req: Request) {
  const { slug } = await req.json().catch(() => ({ slug: "" }));
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const provider = getProvider(String(slug));
  if (!provider) return NextResponse.json({ error: `Unknown provider: ${slug}` }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  // Providers with credentials on this deployment must use the real flow.
  if (isConfigured(provider)) {
    return NextResponse.json(
      { error: `${provider.name} can connect for real on this deployment — use the real consent screen instead.` },
      { status: 409 }
    );
  }

  const admin = adminClient();
  const { error } = await admin.from("integrations").upsert({
    user_id: user.id,
    slug: provider.slug,
    name: provider.name,
    category: provider.category,
    status: "connected",
    mode: "demo",
    connected_at: new Date().toISOString(),
  }, { onConflict: "user_id,slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("activity").insert({
    user_id: user.id,
    message: `Demo connection: ${provider.name} (no real account linked)`,
  });

  return NextResponse.json({ ok: true, mode: "demo", provider: provider.name });
}
