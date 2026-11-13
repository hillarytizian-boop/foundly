import { createClient } from "@supabase/supabase-js";

// Public serving route: /s/<slug> renders the agent-built site.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: site } = await supabase
    .from("sites").select("html,business_name,published,slug").eq("slug", slug).maybeSingle();

  if (!site?.html) {
    return new Response(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Site not found</title>
      <style>body{font-family:ui-sans-serif,system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#fbf9f6;color:#141a20}
      a{color:#c1643f}</style></head><body><div style="text-align:center">
      <h1 style="font-size:20px;margin:0 0 6px">No site at this address</h1>
      <p style="color:#5c6672;margin:0 0 14px">It may have been unpublished or renamed.</p>
      <a href="/">Go to Foundly</a></div></body></html>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (!site.published) {
    return new Response(
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Draft — not published</title>
      <style>body{font-family:ui-sans-serif,system-ui,sans-serif;background:#fbf9f6;color:#141a20;margin:0;padding:40px}
      .bar{background:#fff4e5;border:1px solid #ffd9a8;color:#8a5200;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:20px;font-weight:600}
      iframe{width:100%;height:calc(100vh - 120px);border:1px solid rgba(20,26,32,.1);border-radius:12px;background:#fff}</style></head>
      <body><div class="bar">Draft preview — ${site.business_name}. This is not public yet. Publish it from Build to make it live.</div>
      <iframe srcdoc="${site.html.replace(/"/g, "&quot;")}"></iframe></body></html>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  return new Response(site.html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "x-robots-tag": "index, follow",
    },
  });
}
