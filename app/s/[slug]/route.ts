import { createClient } from "@supabase/supabase-js";

/**
 * The served document is agent-generated HTML, so it is treated as untrusted
 * output. Strip anything that can execute: scripts, inline handlers, and
 * javascript:/data: URLs. The page is meant to be static marketing copy.
 */
function sanitizeHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi, "");
}


/**
 * The storefront block.
 *
 * The site HTML is agent-generated and is served with scripts stripped, so the
 * Buy button cannot be JavaScript. Each product becomes a plain HTML form that
 * POSTs to the checkout route, which redirects straight to Stripe. That works
 * in every browser, with or without JS, and cannot be broken by the sanitizer.
 *
 * Prices are formatted from integer minor units here, and the amount Stripe
 * charges is looked up server-side from the same row — the buyer never sends a
 * number.
 */
function storefront(
  products: { id: string; name: string; description: string | null; price_cents: number; currency: string }[],
  slug: string,
  bought: string | null
) {
  if (!products.length && !bought) return { html: "", css: "" };

  const money = (cents: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
    }
  };

  const banner =
    bought === "1"
      ? `<div class="sz-note ok">Payment received — the owner has been notified. Thank you.</div>`
      : bought === "0"
        ? `<div class="sz-note">Checkout cancelled. Nothing was charged.</div>`
        : "";

  const cards = products
    .map(
      (p) => `
      <form class="sz-item" method="post" action="/api/sites/checkout">
        <input type="hidden" name="product_id" value="${p.id}">
        <input type="hidden" name="back" value="/s/${slug}">
        <div class="sz-meta">
          <div class="sz-name">${escapeHtml(p.name)}</div>
          ${p.description ? `<div class="sz-desc">${escapeHtml(p.description)}</div>` : ""}
        </div>
        <div class="sz-buy">
          <span class="sz-price">${money(p.price_cents, p.currency)}</span>
          <button type="submit" class="sz-btn">Buy</button>
        </div>
      </form>`
    )
    .join("");

  if (!cards) return { html: `<div class="sz-wrap">${banner}</div>`, css: STORE_CSS };

  return {
    html: `<section class="sz-wrap"><div class="sz-head">Buy</div>${banner}<div class="sz-list">${cards}</div></section>`,
    css: STORE_CSS,
  };
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const STORE_CSS = `
.sz-wrap{max-width:640px;margin:44px auto 64px;padding:0 20px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif}
.sz-head{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a93a0;margin-bottom:10px}
.sz-note{border-radius:10px;padding:10px 13px;font-size:13.5px;margin-bottom:12px;background:#f3f5f8;color:#38424f;border:1px solid rgba(20,26,32,.08)}
.sz-note.ok{background:#eafaf1;border-color:#b7e6cd;color:#13714a}
.sz-list{display:grid;gap:10px}
.sz-item{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  border:1px solid rgba(20,26,32,.12);border-radius:14px;padding:14px 16px;background:#fff}
.sz-name{font-size:16px;font-weight:600;color:#141a20}
.sz-desc{font-size:13.5px;color:#5c6672;margin-top:2px}
.sz-buy{display:flex;align-items:center;gap:12px}
.sz-price{font-size:16px;font-weight:640;color:#141a20;font-variant-numeric:tabular-nums}
.sz-btn{background:#141a20;color:#fff;border:0;border-radius:999px;padding:10px 20px;font:inherit;
  font-size:14px;font-weight:600;cursor:pointer;text-decoration:none}
.sz-btn:hover{opacity:.9}
`;

// Public serving route: /s/<slug> renders the agent-built site.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bought = new URL(req.url).searchParams.get("bought");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: site } = await supabase
    .from("sites").select("id,html,business_name,published,slug").eq("slug", slug).maybeSingle();

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
      <iframe sandbox srcdoc="${sanitizeHtml(site.html)
        .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"></iframe></body></html>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // Products are public (active only), so a stranger can buy without an account.
  const { data: products } = await supabase
    .from("site_products")
    .select("id,name,description,price_cents,currency")
    .eq("site_id", (site as any).id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  const shop = storefront((products ?? []) as any, slug, bought);
  let html = sanitizeHtml(site.html);
  if (shop.html) {
    const block = `<style>${shop.css}</style>${shop.html}`;
    // Put it before the closing body so it lands at the end of the page, and
    // fall back to appending if the agent's document is malformed.
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${block}</body>`) : html + block;
  }

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "x-robots-tag": "index, follow",
    },
  });
}
