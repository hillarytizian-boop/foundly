import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProvider, isConfigured, PROVIDER_CAVEATS } from "@/lib/integrations";
import { guideFor } from "@/lib/connect-guides";
import ConnectPanel from "@/components/app/ConnectPanel";

export const dynamic = "force-dynamic";

const PASTED = new Set(["x", "linkedin", "facebook", "instagram", "tiktok", "slack", "gmail"]);

/**
 * The page Milo links to when it connects something.
 *
 * Three honest states, decided server-side so the page can never dress a demo
 * up as a real connection:
 *   oauth — this deployment holds app credentials, so use the platform's screen
 *   paste — no app credentials, but the platform verifies a token you hold
 *   demo  — neither is possible; say so on the page, in the URL, and in the data
 */
export default async function ConnectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = getProvider(slug);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?returnTo=${encodeURIComponent(`/connect/${slug}`)}`);

  if (!provider) {
    return (
      <main className="page-narrow" style={{ maxWidth: 560, paddingTop: 48 }}>
        <div className="card card-pad-lg">
          <span className="eyebrow">Connect</span>
          <h1 style={{ fontSize: 22, margin: "2px 0 6px" }}>No such tool</h1>
          <p className="small muted">
            There is no provider called <code>{slug}</code>. Ask Milo to connect something and it
            will hand you a working link.
          </p>
          <Link className="btn btn-sm" href="/workspace/integrations" style={{ marginTop: 12, display: "inline-flex" }}>
            All connections
          </Link>
        </div>
      </main>
    );
  }

  const oauthReady = isConfigured(provider);
  const mode: "oauth" | "paste" | "demo" = oauthReady
    ? "oauth"
    : PASTED.has(slug)
    ? "paste"
    : "demo";

  const { data: row } = await supabase
    .from("integrations")
    .select("status,mode")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  const { data: token } = await supabase
    .from("integration_tokens")
    .select("account_label")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  const guide = guideFor(slug) ?? null;

  return (
    <main className="page-narrow" style={{ maxWidth: 620, paddingTop: 40, paddingBottom: 60 }}>
      <Link href="/workspace" className="small dim" style={{ display: "inline-block", marginBottom: 14 }}>
        ← Back to Milo
      </Link>

      <ConnectPanel
        slug={provider.slug}
        name={provider.name}
        category={provider.category}
        mode={mode}
        canPost={provider.canPost ?? null}
        connected={row?.status === "connected" || Boolean(token)}
        account={(token as any)?.account_label ?? null}
        demoConnected={row?.status === "connected" && row?.mode === "demo"}
        docs={provider.docs}
        callback={`/api/integrations/callback/${provider.slug}`}
        guide={guide}
        caveat={PROVIDER_CAVEATS[provider.slug] ?? null}
      />
    </main>
  );
}
