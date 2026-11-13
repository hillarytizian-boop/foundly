import { createClient } from "@supabase/supabase-js";
import { getProvider, type Provider } from "@/lib/integrations";

/** Service-role client: the only thing allowed to touch integration_tokens. */
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function saveToken(userId: string, slug: string, payload: {
  access_token: string; refresh_token?: string; expires_in?: number;
  token_type?: string; scope?: string; account_label?: string;
}) {
  const admin = adminClient();
  await admin.from("integration_tokens").upsert({
    user_id: userId,
    slug,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token ?? null,
    token_type: payload.token_type ?? "Bearer",
    scope: payload.scope ?? null,
    expires_at: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    account_label: payload.account_label ?? null,
  }, { onConflict: "user_id,slug" });

  const provider = getProvider(slug);
  await admin.from("integrations").upsert({
    user_id: userId, slug, name: provider?.name ?? slug, category: provider?.category ?? "Other",
    status: "connected", connected_at: new Date().toISOString(),
  }, { onConflict: "user_id,slug" });
}

export async function getToken(userId: string, slug: string) {
  const admin = adminClient();
  const { data } = await admin.from("integration_tokens").select("*").eq("user_id", userId).eq("slug", slug).maybeSingle();
  return data;
}

/** Exchange an OAuth code for a token. */
export async function exchangeCode(p: Provider, code: string, origin: string, verifier?: string) {
  const clientId = process.env[p.envKeys.id];
  const clientSecret = process.env[p.envKeys.secret];

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${origin}/api/integrations/callback/${p.slug}`,
    client_id: clientId ?? "",
  });
  if (clientSecret) body.set("client_secret", clientSecret);
  if (p.pkce && verifier) body.set("code_verifier", verifier);

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  // Notion uses HTTP basic with the client secret
  if (p.slug === "notion" && clientSecret) {
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }
  // X requires basic auth with client id/secret for confidential clients
  if (p.slug === "x" && clientSecret) {
    headers.authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }

  const res = await fetch(p.tokenUrl, { method: "POST", headers, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (!json.access_token && !json.authed_user)) {
    throw new Error(json.error_description || json.error || `${p.name} rejected the token exchange`);
  }

  // Slack nests the token
  const access_token = json.access_token ?? json.authed_user?.access_token;
  return {
    access_token,
    refresh_token: json.refresh_token,
    expires_in: json.expires_in,
    token_type: json.token_type,
    scope: json.scope,
    account_label: json.team?.name ?? json.authed_user?.id ?? null,
  };
}
