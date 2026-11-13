# Foundly — v3 capability report

**Live:** https://foundly-three.vercel.app · **Repo:** https://github.com/hillarytizian-boop/foundly
**Brand:** Foundly · AI employee **Milo** · tagline "An AI employee for anyone with an idea."

---

## 1. What v3 added

### A team of coding agents that builds and publishes websites

Four specialists run in sequence, in the browser, with every step visible:

| Agent | Job | Output |
| --- | --- | --- |
| **Strategist** | reads the brief, writes the copy | headline, eyebrow, sub, 3 sections, 3 FAQs, CTA |
| **Builder** | writes the page | one self-contained HTML document (inline CSS, zero network requests) |
| **Reviewer** | audits and fixes | quality score /100 + guardrail report + repairs |
| **Publisher** | slug, metadata, deploy | `/s/<slug>`, title, meta description, publish control |

Output is a **real, self-contained HTML page** served at `/s/<slug>` — not a description of one.
Drafts render in an iframe preview; pressing **Publish** makes them public. Unpublished slugs show an
honest draft banner, unknown slugs show a 404 page.

Cost: **3 credits** per build, charged once, balance returned in the response.

### Two engines, both honest

* **Fast · built-in** (default) — deterministic team. Instant, no network, identical structure and guardrails.
* **Live · model** — the same four agents driven by `z-ai/glm-5.3-flash` on NVIDIA NIM
  (`https://integrate.api.nvidia.com/v1`).

The live path is **split into two stages, one model call per HTTP request**, so no request outlives the
platform timeout:

1. `stage: "plan"` → Strategist (one reasoning call, typically 60–200 s) → saved as a draft
2. `stage: "render"` → Builder + Reviewer + Publisher (deterministic, ~2 s)

If the model is slow, times out or returns unusable output, the built-in team takes over **and the UI says
so**. Live mode never substitutes invented output, and `/api/agents/build` returns the reason verbatim.

### ECC-style harness (`lib/harness.ts`)

Modelled on [affaan-m/ECC](https://github.com/affaan-m/ECC) — "the agent harness performance optimization
system" (skills, instincts, memory, guardrails, research-first development). Ideas ported as deterministic
layers rather than a shelled-out coding CLI:

1. **Guardrails** (run on every build, pass/fail shown in the UI)
   * `G1.no-secrets` — **blocking**: 5 credential/token/key patterns in generated output
   * `G2.no-unearned-claims` — guarantees, medical claims, financial promises, invented awards
   * `G3.reachable` — a real contact route exists
   * `G4.self-contained` — no third-party scripts
   * `G5.accessible-basics` — lang + charset declared
   * Unearned claims are **repaired automatically** ("guaranteed" → "reliable", "revolutionary" → "new", …)
2. **Research** — competitor patterns, available differentiators and open questions, computed from the brief
   before any copy is written
3. **Skills** — 6 named patterns (`copy.headline`, `layout.above-fold`, `layout.sections`,
   `code.self-contained`, `a11y.basics`, `perf.no-network`) injected into the model prompts
4. **Instincts** — triggered corrections (missing price, missing name, thin copy, no contact, hyperbole)
5. **Memory** — prior business names for the same account, surfaced to bias new builds

### Real app connections

19 providers catalogued: X, LinkedIn, Facebook Page, Instagram, TikTok, YouTube, Gmail, Google Calendar,
Sheets, Drive, Slack, Notion, HubSpot, Airtable, Mailchimp, Dropbox, GitHub, Vercel, Stripe.

**Publishable right now:** X, LinkedIn, Facebook, Instagram, Slack, Gmail (`lib/social.ts`).

OAuth is fully implemented (`/api/integrations/start` → provider → `/api/integrations/callback/[slug]` →
token stored server-side in `integration_tokens`, RLS on, service-role only). **Every provider currently
reports "needs credentials"** because no OAuth client IDs/secrets are set on this deployment. The UI says
exactly that instead of faking a connection, and the publish button stays disabled until a channel is
genuinely connected.

To enable a provider, add its env vars (e.g. `X_CLIENT_ID` / `X_CLIENT_SECRET`) — the Connect button then
goes live with no code change.

Backend routes: `/api/social/post` (auth → token → publish → log to `social_publications` → activity entry).

### Model wiring

* `NVIDIA_API_KEY` — set as a **sensitive** env var in Vercel (production, preview, development).
  Never committed, never sent to the browser, never returned by any endpoint.
* `NVIDIA_MODEL` — defaults to `z-ai/glm-5.3-flash`.
* `GET /api/models/status` reports `{configured, model, endpoint}` and nothing else.
* `POST /api/models/status` is a live probe; `POST /api/milo/chat` gives Milo real replies when configured.

Known constraint, stated plainly: `glm-5.3-flash` is a reasoning model that emits ~3–6 k tokens of hidden
reasoning before answering, so a call takes **60–200 s** (observed 69 s, 88 s, 110 s, 162 s, 169 s) and
sometimes exceeds 280 s. It is excellent for copy and Q&A; it cannot assemble a 10 k-character page inside
one serverless request. That is why page assembly is deterministic and only copy generation is live.

---

## 2. Data model additions

* `integration_tokens` — `user_id, slug, access_token, refresh_token, token_type, scope, expires_at,
  account_label`. RLS enabled, **no policies** → service role only.
* `social_publications` — `user_id, slug, body, status, external_id, external_url, error`. RLS: own rows.
* `sites` gained `slug` (globally unique partial index), `html`, `published`, `agent_run` (jsonb),
  `score`.

Slug collisions are resolved against the **service-role client**, because the unique index is global while
RLS hides other users' rows — checking under RLS produced a duplicate-key failure in testing.

---

## 3. Verification

`BASE=<url> node e2e-v2.js` — **30 checks, all passing**, `CONSOLE_ERRORS: none`.

Coverage includes: signup → workspace, capability form, all four agent steps reported, reviewer score,
slugged site created, iframe preview, engine toggle, guardrail report, publish → `live`,
`/s/<slug>` served publicly (200), outreach approval gate + approval, automation creation, documents list,
integration catalogue (19 providers), readiness count, unconfigured providers disabled, no fake Connect
links, 7 publishable channels, social publisher panel, publish blocked until connected, dashboard stats,
credits from profile, model status configured, **no key leak**, **live model answered via the app (88 s)**,
and both marketing pages.

---

## 4. Known gaps

* No OAuth client credentials on the deployment → no provider can actually be connected yet.
* No cron worker for automations; no AI phone answering; no Stripe keys (checkout is stubbed).
* TikTok/YouTube publishing intentionally returns "not supported" rather than pretending.
* Facebook/Instagram need a page ID / IG user ID from the user at publish time.
* Live model latency (60–200 s per call) makes the live engine unsuitable for one-click builds; fast is
  the default for that reason.
