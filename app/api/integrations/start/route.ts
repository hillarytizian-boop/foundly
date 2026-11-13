import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProvider, isConfigured, buildAuthorizeUrl } from "@/lib/integrations";
import { createHash, randomBytes } from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const p = getProvider(slug);
  if (!p) return NextResponse.json({ error: `Unknown provider: ${slug}` }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in?returnTo=/workspace/integrations", req.url));

  if (!isConfigured(p)) {
    return NextResponse.redirect(new URL(
      `/workspace/integrations?error=${encodeURIComponent(`${p.name} needs its API credentials added to this deployment before it can connect.`)}`, req.url));
  }

  const state = randomBytes(16).toString("hex");
  const verifier = p.pkce ? randomBytes(32).toString("base64url") : undefined;
  const challenge = verifier ? createHash("sha256").update(verifier).digest("base64url") : undefined;

  const authUrl = buildAuthorizeUrl(p, url.origin, state, challenge);

  const res = NextResponse.redirect(authUrl);
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, maxAge: 600, path: "/", secure: url.protocol === "https:" };
  res.cookies.set(`oauth_state_${slug}`, state, cookieOpts);
  if (verifier) res.cookies.set(`oauth_verifier_${slug}`, verifier, cookieOpts);
  return res;
}
