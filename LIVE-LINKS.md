# Foundly — Live on Vercel ✅

**Verified 13 Nov 2026 against production build `837ed90` / deployment `dpl_CgPUHqeKXuULwdg3dvC1LsgVba87`.**

---

## 🔗 THE LIVE LINK

# **https://foundly-three.vercel.app**

Public, no login wall, no tunnel, permanent (as long as the Vercel project exists).

| Page | Status |
|---|---|
| https://foundly-three.vercel.app/ | 200 — marketing home |
| /about | 200 |
| /pricing | 200 |
| /sign-up | 200 — real Supabase signup |
| /sign-in | 200 |
| /line | 200 — Milo workspace |
| /api/milo/chat | 200 — Milo replies |
| /api/sites/generate | 200 |
| /api/outreach/generate | 200 — **new** |
| /api/social/generate | 200 — **new** |
| /api/checkout | 200 — friendly "add Stripe keys" notice |

> Note: `foundly-hillarytizian-1989.vercel.app` and the per-deploy URLs still sit behind
> Vercel Deployment Protection. `foundly-three.vercel.app` is the vanity domain attached at
> project creation and is publicly reachable — that's the one to share.

## ✅ End-to-end tests (real browser, headless Chromium)

| Test | Result |
|---|---|
| Home loads, correct title | PASS |
| Sign up with new email → redirected to `/line` | PASS |
| Sign-in round-trip | PASS |
| Chat: "I sell handmade candles in Nairobi at $15 each" → Milo's 4-step plan | PASS |
| Site builder: builds page and **saves to DB**, appears under "Your sites" | PASS |
| Outreach: subject + body + send notes generated | PASS |
| Social: 3 posts with hooks, CTAs, hashtags generated | PASS |
| Payments: graceful "Stripe not configured" notice | PASS |
| Browser console/page errors | none |

Re-runnable: `node e2e-check.js` and `node e2e-full.js` (Playwright, in the repo).

## 🔌 Everything that's connected

| Piece | Where | State |
|---|---|---|
| GitHub repo | github.com/hillarytizian-boop/foundly | public, `main` @ `f14bf36` |
| Vercel project | `foundly` (prj_zR24gBCjxOuI0CpSdTjIymhMeswe) | production READY, promoted |
| Env vars (Vercel) | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY | set for production + preview + development |
| Supabase | Trading-bot- (uopplshaxbilbyrceddk) | 7 tables, RLS on, signup trigger live |
| Supabase auth | site_url = https://foundly-three.vercel.app, redirect allow-list updated | done (old app URLs kept) |
| wa-bulk-ai-panel | mgnawlfjxtkpnbjhkvis | restored to original 10 tables, untouched |

Database after test cleanup: 0 rows in every Foundly table (clean slate for real users).

## ⚠️ Two things still need a key (by design, not broken)

1. **OpenAI** — `OPENAI_API_KEY` empty → Milo uses built-in demo replies. Add the key in
   Vercel → Settings → Environment Variables and redeploy for live GPT responses.
2. **Stripe** — `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` empty →
   checkout returns a clear notice instead of a payment link.

Paste either key and I'll wire it in and redeploy.

## 🧱 Fixes made this session

- Next.js `15.0.3` → `15.5.29` (Vercel hard-blocks the old version: CVE-2025-66478).
- Cleared a stale `.next` cache that caused 500s after the upgrade.
- Outreach + Social tabs were placeholders → real generators + API routes that persist to
  `outreach_campaigns` / `social_posts`.
- "Your sites" list didn't refresh after building → now reloads immediately.
- Supabase auth redirect config pointed only at the trading-bot app → now allows Foundly.
