"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppFrame from "@/components/app/AppFrame";
import { GlowCloud } from "@/components/marketing/Mascot";

/**
 * Selling — the page that answers "did anyone actually pay me?"
 *
 * Two lists and nothing else: what is for sale, and what was bought. A
 * dashboard that hides revenue behind three taps is the thing this replaces.
 *
 * Honesty rules that shape this file:
 *   · A pending checkout is NOT revenue and is never counted in the total.
 *   · If Stripe keys are missing, we say so instead of showing an empty list
 *     that looks like "no sales yet".
 *   · The Buy button is the real published URL, opened in a new tab, so the
 *     owner can check the page a customer would see.
 */

type Site = { id: string; slug: string; business_name: string | null; published: boolean };
type Product = {
  id: string; site_id: string; name: string; description: string | null;
  price_cents: number; currency: string; active: boolean;
};
type Order = {
  id: string; site_id: string | null; product_id: string | null;
  amount_cents: number; currency: string; status: string;
  buyer_email: string | null; created_at: string; paid_at: string | null;
};

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function when(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default function Selling() {
  const [sites, setSites] = useState<Site[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [siteId, setSiteId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");

  const load = useCallback(async () => {
    const [p, o] = await Promise.all([
      fetch("/api/sites/products").then((r) => (r.ok ? r.json() : { products: [] })).catch(() => ({ products: [] })),
      fetch("/api/sites/orders").then((r) => (r.ok ? r.json() : { orders: [] })).catch(() => ({ orders: [] })),
    ]);
    setProducts(p.products ?? []);
    setOrders(o.orders ?? []);
    // Sites come from the same client the Build page uses.
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("sites").select("id,slug,business_name,published")
        .order("created_at", { ascending: false }).limit(20);
      setSites((data ?? []) as Site[]);
      if (data?.length && !siteId) setSiteId((data[0] as any).id);
    } catch { /* leave the picker empty; the form will say so */ }
    setReady(true);
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch("/api/sites/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: siteId, name, price, description: desc }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(j.error ?? "Could not add that."); return; }
    setName(""); setPrice(""); setDesc("");
    setMsg("Added. The Buy button is on the published page now.");
    await load();
  }

  async function removeProduct(id: string) {
    setBusy(true);
    await fetch("/api/sites/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "delete", id }),
    });
    setBusy(false);
    await load();
  }

  if (!ready) {
    return (
      <AppFrame bare>
        <div className="a-screen"><div className="a-splash"><GlowCloud className="a-cloud" /></div></div>
      </AppFrame>
    );
  }

  const paid = orders.filter((o) => o.status === "paid");
  const total = paid.reduce((sum, o) => sum + o.amount_cents, 0);
  const currency = paid[0]?.currency ?? products[0]?.currency ?? "usd";
  const pending = orders.filter((o) => o.status === "pending").length;
  const siteOf = (id: string | null) => sites.find((s) => s.id === id);

  return (
    <AppFrame title="Selling" subtitle={paid.length ? `${money(total, currency)} collected` : "Nothing sold yet"} back="/workspace" showBack>
      <div className="a-scroll">
        <div style={{ maxWidth: 660, margin: "0 auto", padding: "4px 0 40px" }}>

          {/* ---------- the number ---------- */}
          <div className={`ap-card ${paid.length ? "on" : ""}`}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span className={`ap-dot ${paid.length ? "ok" : "off"}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 650 }}>
                  {paid.length ? `${money(total, currency)} collected` : "Nothing collected yet"}
                </div>
                <p className="small muted" style={{ margin: "4px 0 0", lineHeight: 1.55 }}>
                  {paid.length
                    ? <>Across {paid.length} order{paid.length === 1 ? "" : "s"}. The money goes straight to your own Stripe account — Foundly takes nothing.</>
                    : "Add a product to a published site and its Buy button takes real cards. The money lands in your own Stripe account — Foundly takes no cut and never holds it."}
                </p>
              </div>
            </div>
            {pending > 0 && (
              <p className="small dim" style={{ margin: "10px 0 0" }}>
                {pending} checkout{pending === 1 ? "" : "s"} started but not paid — not counted above.
              </p>
            )}
          </div>

          {msg && <p className="small" style={{ margin: "12px 0 0", color: "rgba(255,255,255,.78)" }}>{msg}</p>}

          {/* ---------- what is for sale ---------- */}
          <h2 className="ap-h2">For sale</h2>

          {sites.length === 0 && (
            <div className="ap-empty">
              <b>No sites yet.</b>
              <span className="small muted" style={{ display: "block", marginTop: 4 }}>
                A product has to live on a page. <Link href="/workspace/build" style={{ textDecoration: "underline" }}>Build one first</Link> — it takes about a minute.
              </span>
            </div>
          )}

          {sites.length > 0 && products.length === 0 && (
            <div className="ap-empty">
              <b>Nothing for sale yet.</b>
              <span className="small muted" style={{ display: "block", marginTop: 4 }}>
                Add your first product below. One clear thing at one clear price sells better than a catalogue.
              </span>
            </div>
          )}

          {products.map((p) => {
            const site = siteOf(p.site_id);
            return (
              <div key={p.id} className="ap-goal">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</span>
                    <span className="a-tag ok">{money(p.price_cents, p.currency)}</span>
                  </div>
                  {p.description && <p className="small muted" style={{ margin: "3px 0 0" }}>{p.description}</p>}
                  <p className="small dim" style={{ margin: "5px 0 0" }}>
                    {site ? (
                      <>
                        on {site.slug}{" "}
                        {site.published ? (
                          <a href={`/s/${site.slug}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>view the page</a>
                        ) : (
                          <span>· not published, so the button is not live</span>
                        )}
                      </>
                    ) : "site missing"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="ap-mini bad" onClick={() => removeProduct(p.id)} disabled={busy}>Remove</button>
                </div>
              </div>
            );
          })}

          {/* ---------- add one ---------- */}
          {sites.length > 0 && (
            <form onSubmit={addProduct} className="ap-card" style={{ marginTop: 14 }}>
              <div style={{ fontSize: 14.5, fontWeight: 650, marginBottom: 8 }}>Add something to sell</div>
              <select className="input" value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ marginBottom: 8 }}>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.business_name || s.slug}{s.published ? "" : " (draft)"}</option>)}
              </select>
              <input className="input" placeholder="What it is — e.g. Amber candle, 200g" value={name}
                onChange={(e) => setName(e.target.value)} style={{ marginBottom: 8 }} />
              <input className="input" placeholder="Price — e.g. $45 or KSh 2,500" value={price}
                onChange={(e) => setPrice(e.target.value)} style={{ marginBottom: 8 }} inputMode="decimal" />
              <input className="input" placeholder="One line about it (optional)" value={desc}
                onChange={(e) => setDesc(e.target.value)} style={{ marginBottom: 10 }} />
              <button className="btn btn-sm" type="submit" disabled={busy || !name.trim() || !price.trim()}>
                {busy ? "…" : "Add product"}
              </button>
              <p className="small dim" style={{ margin: "10px 0 0", lineHeight: 1.55 }}>
                The price is charged exactly as typed. Payments run on your own Stripe account —
                Foundly never holds the money and takes no cut.
              </p>
            </form>
          )}

          {/* ---------- orders ---------- */}
          <h2 className="ap-h2">Orders</h2>
          {orders.length === 0 && (
            <p className="small muted">No orders yet. The first one will appear here the moment Stripe confirms it.</p>
          )}

          {orders.map((o) => {
            const product = products.find((p) => p.id === o.product_id);
            return (
              <div key={o.id} className="ap-goal ap-goal-quiet">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{money(o.amount_cents, o.currency)}</span>
                    <span className={`a-tag ${o.status === "paid" ? "ok" : o.status === "failed" || o.status === "refunded" ? "bad" : "wait"}`}>{o.status}</span>
                    <span style={{ fontSize: 13.5 }}>{product?.name ?? "product"}</span>
                  </div>
                  <p className="small dim" style={{ margin: "4px 0 0" }}>
                    {o.buyer_email || "no email"} · {when(o.paid_at || o.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppFrame>
  );
}
