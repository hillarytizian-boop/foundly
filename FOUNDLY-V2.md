# Foundly v2 — built against the Foundable capability report

**Live:** https://foundly-three.vercel.app
**Repo:** github.com/hillarytizian-boop/foundly (branch `main`)
**Deployed commit:** `b0cb7d7` (build before it: `38b7f21`, verified)
**Verified:** 15/15 automated browser checks passing against production, zero console errors.

---

## What the report described, and what we shipped

The report describes Ted as an AI employee operating across **Home / Build / Run** with a
capability map of Discover → Plan → Create → Publish → Market → Acquire → Communicate →
Sell → Operate → Automate → Monitor, a credit-based subscription model, approval gates, and
34 integrations. Foundly v2 implements that architecture, not a marketing page.

| Report capability | Foundly v2 status |
|---|---|
| Home command centre | ✅ `/workspace` — credits, plan, tasks done, approvals pending, recent work, activity feed, suggestions |
| Build environment | ✅ `/workspace/build` — website, site updates, naming, logo/palette, catalogue |
| Run environment | ✅ `/workspace/run` — outreach, social, leads, email replies, support macros, weekly review |
| Task execution with status | ✅ `tasks` table: queued → running → needs_approval → done/rejected/failed, with error + refund |
| Human supervision | ✅ approve / reject on every gated capability; blocked until you decide |
| Credit accounting | ✅ per-capability cost, balance deducted, ledger (`credit_events`), auto-refund on failure |
| Scheduled automation | ✅ `/workspace/run` → automations with cadence + pause/resume |
| Autopilot toggle | ✅ per-automation, **off by default** |
| Documents output | ✅ `/workspace/docs` — every artefact stored, readable, copy/download as markdown |
| Integrations catalogue | ✅ `/workspace/integrations` — 37 providers, 14 categories, connect/disconnect persisted |
| Pricing plans | ✅ Free/Basic $25/Pro $50/Max $200 with credit allowances, plus a credit-cost table |
| Proof before polish | ✅ marketing site rewritten to state the capability map and the honesty rules |

## The 17 capabilities Milo can actually run

| Environment | Capability | Credits | Approval |
|---|---|---|---|
| Home | Generate business ideas | 1 | — |
| Home | Validate an idea | 2 | — |
| Home | Market research brief | 3 | — |
| Home | Competitor teardown | 3 | — |
| Home | Business plan | 4 | — |
| Home | Pitch / investor deck outline | 3 | — |
| Build | Build website | 3 | — |
| Build | Update website copy | 1 | ✅ |
| Build | Name + tagline | 2 | — |
| Build | Logo direction + palette | 2 | — |
| Build | Product catalogue + price list | 2 | — |
| Run | Outreach sequence | 2 | ✅ |
| Run | Launch week posts | 2 | ✅ |
| Run | Build prospect list | 3 | — |
| Run | Draft email / reply | 1 | ✅ |
| Run | Support FAQ + macros | 2 | — |
| Run | Weekly business review | 1 | — |

Each produces a real structured artefact (headings + body + markdown export) — not a
"coming soon" placeholder. No LLM key required; `OPENAI_API_KEY` upgrades the writing quality
without changing the plumbing.

## Database (Supabase `Trading-bot-`, project `uopplshaxbilbyrceddk`)

**13 tables, RLS "own rows" on every one:**

`profiles` (credits, plan) · `ideas` · `sites` · `milo_messages` · `outreach_campaigns` ·
`social_posts` · `payments` · `tasks` · `automations` · `documents` · `integrations` ·
`credit_events` · `activity`

Migrations live in `supabase/migrations/` and are applied to the live project.
Signup trigger creates a profile with 15 credits + `free` plan automatically.

## New API surface

| Route | Does |
|---|---|
| `POST /api/tasks/run` | Validates inputs, checks credits, creates the task, executes it, returns the artefact |
| `POST /api/tasks/approve` | Approve or reject a gated task; rejected work never leaves Foundly |
| `POST /api/milo/chat` | Conversational Milo (demo mode without a key) |
| `POST /api/sites/generate` · `/api/outreach/generate` · `/api/social/generate` | Legacy v1 generators, still wired |
| `POST /api/checkout` · `/api/webhooks/stripe` | Stripe wiring, returns a clear notice until keys are added |

## Test evidence

`e2e-v2.js` runs the whole product in headless Chromium against whatever `BASE` you point it at:

```
PASS | signup -> /workspace
PASS | home capability form rendered
PASS | site built + task completed
PASS | site persisted in website list
PASS | outreach gated behind approval
PASS | approve control shown
PASS | approval accepted
PASS | automation created
PASS | documents page lists artefacts
PASS | integrations page renders catalogue
PASS | integration connect persisted
PASS | home dashboard renders stats
PASS | credits loaded from profile
PASS | marketing /   +   marketing /pricing
CONSOLE_ERRORS: none
ALL CHECKS PASSED
```

Test accounts are deleted after each run — all 13 tables are at 0 rows right now.

## Honest gaps (deliberately not faked)

1. **Integration OAuth is not live.** `/workspace/integrations` records the connection intent and
   drives the UI. Real Gmail/Instagram/HubSpot OAuth needs each provider's client credentials —
   Milo does not claim a send succeeded until a provider confirms it.
2. **No AI phone answering.** The report lists it as higher-tier; it needs Twilio/Telnyx telephony,
   which is a separate build.
3. **No Stripe transactions yet.** Checkout returns a clear "add keys" notice rather than a
   fake payment link.
4. **Automations store schedule + autopilot flag; there is no cron worker yet.** A Vercel Cron
   hitting a runner endpoint is the next step and needs 20 lines.
5. **Milo's output is deterministic without `OPENAI_API_KEY`.** Useful, but not yet bespoke per user.

## Next three things worth building

1. Vercel Cron → `/api/automations/tick` so scheduled work actually fires.
2. Stripe: subscription checkout per plan + credit top-ups.
3. First real OAuth integration (Gmail or Instagram) — turns draft-only outreach into sent outreach.
