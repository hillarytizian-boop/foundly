/**
 * Price parsing — one implementation, used by the API, by Milo's tools and by
 * the tests.
 *
 * Foundly stores money as integer minor units everywhere (see
 * supabase/migrations/20261118000000_foundly_v4_just_go.sql). A human types
 * "$45 per set"; this turns that into 4500 usd exactly once, at the boundary,
 * and returns null rather than guessing when it cannot tell.
 *
 * It lives in lib/ rather than beside the route because Next.js route files may
 * only export handlers — and because the tool layer needs it too.
 */

const CURRENCY_SYMBOLS: Record<string, string> = { $: "usd", "€": "eur", "£": "gbp", KSh: "kes", KES: "kes" };

/** "$45 per set" → 4500 usd. Returns null rather than guessing. */
export function parsePrice(input: string): { cents: number; currency: string } | null {
  const text = String(input ?? "").trim();
  if (!text) return null;

  const m = text.match(/(?:(KSh|KES|\$|€|£)\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (!m) return null;

  const symbol = (m[1] ?? "$").toUpperCase();
  const currency = CURRENCY_SYMBOLS[symbol] ?? CURRENCY_SYMBOLS[m[1] ?? "$"] ?? "usd";
  const amount = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const cents = Math.round(amount * 100);
  // Stripe rejects anything under 50 cents in USD/EUR/GBP.
  if (cents < 50) return null;
  return { cents, currency };
}

