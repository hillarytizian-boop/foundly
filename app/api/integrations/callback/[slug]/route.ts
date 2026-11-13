import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/integrations";
import { exchangeCode, saveToken } from "@/lib/tokens";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error_description") || url.searchParams.get("error");

  const p = getProvider(slug);
  if (!p) return NextResponse.redirect(new URL("/workspace/integrations?error=Unknown+provider", req.url));

  if (errorParam) {
    return NextResponse.redirect(new URL(`/workspace/integrations?error=${encodeURIComponent(`${p.name}: ${errorParam}`)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/workspace/integrations?error=${encodeURIComponent(`${p.name} returned no code`)}`, req.url));
  }

  // CSRF: state must match what we set
  const cookieState = req.headers.get("cookie")?.match(new RegExp(`oauth_state_${slug}=([^;]+)`))?.[1];
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL(`/workspace/integrations?error=${encodeURIComponent("Security check failed — please try connecting again.")}`, req.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in?returnTo=/workspace/integrations", req.url));

  const verifier = req.headers.get("cookie")?.match(new RegExp(`oauth_verifier_${slug}=([^;]+)`))?.[1];

  try {
    const token = await exchangeCode(p, code, url.origin, verifier ? decodeURIComponent(verifier) : undefined);
    if (!token.access_token) throw new Error("The provider did not return an access token");
    await saveToken(user.id, slug, token as any);

    const res = NextResponse.redirect(new URL(`/workspace/integrations?connected=${slug}`, req.url));
    res.cookies.delete(`oauth_state_${slug}`);
    res.cookies.delete(`oauth_verifier_${slug}`);
    return res;
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/workspace/integrations?error=${encodeURIComponent(e.message || "Could not complete the connection")}`, req.url));
  }
}
