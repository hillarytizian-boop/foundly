import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveToken } from "@/lib/tokens";
import { getProvider } from "@/lib/integrations";
import { verifyAccount } from "@/lib/social";

/**
 * Connect a provider with a token you already hold. The token is checked
 * against the provider's own API first — we only save a "connected" row once
 * that provider confirms the account. Rejections are surfaced verbatim.
 */
export async function POST(req: Request) {
  const { slug, token, pageId, igUserId, channel, to } = await req.json();
  if (!slug || !token) {
    return NextResponse.json({ error: "slug and token are required" }, { status: 400 });
  }

  const provider = getProvider(slug);
  if (!provider) return NextResponse.json({ error: `Unknown provider: ${slug}` }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const check = await verifyAccount(slug, token, { pageId, igUserId, channel, to });
  if (!check.ok) {
    return NextResponse.json(
      { error: check.error || "The provider rejected that token.", verified: false },
      { status: 400 }
    );
  }

  await saveToken(user.id, slug, {
    access_token: token,
    token_type: "Bearer",
    account_label: check.label,
    scope: "pasted token",
  });

  return NextResponse.json({ ok: true, verified: true, account: check.label });
}

/** Verify without saving — lets the UI show the account before you commit. */
export async function PUT(req: Request) {
  const { slug, token, pageId, igUserId, channel, to } = await req.json();
  if (!slug || !token) {
    return NextResponse.json({ error: "slug and token are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const check = await verifyAccount(slug, token, { pageId, igUserId, channel, to });
  return NextResponse.json(check, { status: check.ok ? 200 : 400 });
}
