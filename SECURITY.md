# Security review — Foundly

**Date:** 2026-11-14
**Scope:** `foundly-three.vercel.app` (commit `42330e9`), Supabase project `uopplshaxbilbyrceddk`, all 18 API routes, all 14 pages, and the generated-site serving path.
**Method:** every finding below was reproduced against the live system before it was fixed, and re-tested after. No finding is theoretical.

---

## Fixed in this pass

### 1. CRITICAL — users could give themselves unlimited credits

`profiles` had a single policy, `"own rows"`, `FOR ALL`. `FOR ALL` includes `UPDATE`, and the anon key is public, so any signed-in user could run this from their own browser console:

```js
await supabase.from('profiles').update({ credits: 999999 }).eq('id', me)
```

**Reproduced:** signed up fresh → `credits: 15` → PATCH → `credits: 999999`. A build costs 3 credits, so this was unlimited free product and an unbounded NVIDIA bill.

**Fix (migration `lock_down_billing_columns`):**
- Dropped the `FOR ALL` policy; replaced with `SELECT` + `UPDATE`, both scoped to `auth.uid() = id`.
- `GRANT UPDATE (full_name, business_name)` only — `credits` and `plan` are no longer writable by the `authenticated` role at all.
- Added trigger `profiles_guard_billing` that raises `42501` on any `credits`/`plan` change that isn't from `service_role`. Defence in depth: this holds even if a future policy regresses.

**Re-tested:** `PATCH {credits: 999999}` → `403 "credits cannot be changed from the client"`, credits unchanged at 15. `PATCH {plan: "enterprise"}` → 403. `PATCH {business_name}` → 200, still works.

### 2. HIGH — `POST /api/models/status` was an unauthenticated LLM proxy

No auth check at all. Anyone on the internet could `POST` an arbitrary prompt and get NVIDIA's model to answer on your account.

**Reproduced:** `curl -X POST .../api/models/status -d '{"prompt":"..."}'` → `{"ok":true,"text":"..."}` with no session.

**Fix:** requires a session; 20 requests/minute per user. **Re-tested:** `401`.

### 3. HIGH — `/api/checkout` had no auth and no user binding

Sessions could be created anonymously, and nothing tied the session to an account, so the eventual webhook had no one to credit — payments would be orphaned.

**Fix:** requires a session, sets `client_reference_id` and `metadata.user_id` for the webhook. **Re-tested:** `{"error":"Sign in first"}`.

### 4. MEDIUM — stored XSS reachable from the public site path

`/s/<slug>` served agent-generated HTML. Two problems:
- Published sites were served raw, so any `<script>` the model emitted (directly, or via injected brief text) ran on the customer's public page.
- The draft-preview path built `<iframe srcdoc="...">` by escaping **only double quotes**. `<script>` and `onerror=` passed straight through, and the iframe had **no `sandbox`**, so a draft preview executed attacker JS **in the `foundly-three.vercel.app` origin** — i.e. in the session that holds the user's auth cookies.

**Fix:** `sanitizeHtml()` strips `<script>`, `<iframe>`, `<object>`, `<embed>`, all `on*` handlers, `javascript:` URLs, and meta-refresh; the draft iframe is `sandbox`ed and its `srcdoc` is now fully entity-escaped (`&`, `"`, `<`, `>`).

**Re-tested:** `/s/terracotta-supply-42` → 200, 8,179 bytes, **0 `<script>` tags, 0 `on*` handlers**, copy intact. Unit-checked the sanitizer against 7 payloads; legitimate markup (`class`, `style`) survives.

### 5. MEDIUM — no rate limiting anywhere

A single account could loop `/api/agents/build` or the chat routes. Added a fixed-window limiter (`lib/ratelimit.ts`): model 20/min, build 10/min, chat 30/min, all keyed per user id, returning `429` + `retry-after`. Verified the limiter's window/reset/independence logic directly (4th call in a 3-per-minute window is refused; capacity returns after the window).

### 6. LOW — missing security headers

Only HSTS was present. Added via `next.config.mjs`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off), and `poweredByHeader: false`.

---

## Verified clean

| Area | Result |
|---|---|
| Secrets in git history | No `nvapi-` or `ghp_` key. The 4 `nvapi-` hits are test assertions (`/nvapi-[A-Za-z0-9_\-]{20,}/`), not values. |
| Real NVIDIA key in client bundle | **Absent** from `.next/` and `public/`. |
| Service-role key reachable from browser | No `"use client"` file references any secret. |
| RLS coverage | All 23 public tables have RLS enabled. Anon reads across 10 tables returned **empty**, not data. |
| `integration_tokens` | RLS on, **0 policies** — deny-all for clients; only service-role (server) touches it. Correct. |
| Cross-user reads | A signed-in user sees only their own profile (1 row) and 0 sites of others. |
| Cross-user writes | `PATCH` against another user's id returns `204` but changes **0 rows** (RLS filters it). |
| Stripe webhook | Signature verified with `constructEvent` before any handling. |
| `integration_tokens` pasted-token flow | Token verified against the provider's API before a `connected` row is written — no fake connected state. |
| Chat markdown renderer | Deliberately builds React nodes, **no `dangerouslySetInnerHTML`**. |
| Build preview iframe | `sandbox=""` (fully restrictive). Correct. |
| Auth routes | 17 of 18 had `getUser()`; the one that didn't (`models/status`, `checkout`) is now fixed. |
| Migrations | Only `handle_new_user` (15 credits) and `memebot_role` (scoped to `auth.uid()`) run as `SECURITY DEFINER`, both with `search_path` pinned. |
| IDOR on integrations | `status`/`disconnect`/`post` all scope by `user.id` server-side; slug alone grants nothing. |

**Regression suite:** full `e2e-v2.js` green on a fresh production build — including reviewer score, slugged site, canvas preview, guardrail report, onboarding, and chat. The hardening broke nothing.

---

## Still open — needs your decision

1. **Rotate the GitHub PAT.** `ghp_ePfZ…` now authenticates for the REST API but is rejected for `git` operations. It is also in plaintext in this conversation's history. Treat it as compromised.
2. **Rotate the NVIDIA key** once the PAT is rotated. It was pasted in plaintext earlier in the session. Nothing in the repo leaked it, but the transcript is not a secret store.
3. **The rate limiter is per-instance and in-memory.** On serverless it resets with each cold start, so it is a speed bump, not a quota. Real protection needs Redis (Upstash) or Vercel's WAF. Say the word and I'll wire Upstash.
4. **No CSP yet.** I left it off deliberately: Next.js needs nonces for its inline hydration bootstrap, and a wrong CSP silently breaks the app. Happy to add one with a nonce in `middleware.ts` and test it.
5. **Supabase auth settings to tighten:**
   - `mailer_autoconfirm: true` — anyone can sign up with an email they don't own. Fine for a demo, wrong for production.
   - `password_min_length: 6` and `password_hibp_enabled: false` — weak, and no breached-password check.
   - `security_update_password_require_current_password: false` — a stolen session can change the password without knowing the old one.
   - `security_captcha_enabled: false` — no bot defence on signup.
6. **`/s/<slug>` is publicly enumerable** by slug. Intended (they're public sites), but note slugs are guessable from business names, so don't use them for anything private.
7. **Stripe webhook does nothing yet** — it verifies the signature then returns `{received:true}` without crediting. No payment can currently grant credits, which is safe, but the TODO is load-bearing for launch.
8. **Cookie flags** are set by `@supabase/ssr` defaults. Worth confirming `Secure`/`SameSite` in the browser once you're on a custom domain.
