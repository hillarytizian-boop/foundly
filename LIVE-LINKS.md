# Foundly — live links & status

**Project:** Foundly — "An AI employee for anyone with an idea." (AI employee: **Milo**)
**Date:** 13 Nov 2026

---

## 🔗 Working public link (no login required)

### **https://patents-readily-vegas-technical.trycloudflare.com**

Served from the sandbox dev server through a Cloudflare quick tunnel. Verified 200 on
`/`, `/about`, `/pricing`, `/sign-up`, `/sign-in`, `/line`, plus working POSTs to
`/api/milo/chat` and `/api/sites/generate`.

⚠️ This is a **temporary** tunnel — it dies when the sandbox process stops. For a permanent
URL, see "Permanent URL" below.

## 🏠 Permanent URL (Vercel) — needs one click

**https://foundly-hillarytizian-1989.vercel.app** — build READY, promoted to production.
It currently returns a Vercel **Deployment Protection** login prompt because the project's
protection is set to "All Deployments". To open it publicly:

Vercel → project **foundly** → Settings → Deployment Protection → **Vercel Authentication: Disabled** → Save.

No API tool in this session can change that setting; it's a dashboard toggle.

## 📦 Repo

https://github.com/hillarytizian-boop/foundly (public, `main`, commit `15ef327`)

## 🗄️ Database — Supabase `Trading-bot-` (uopplshaxbilbyrceddk)

7 tables, RLS enabled, signup trigger verified end-to-end:
`profiles, ideas, sites, milo_messages, outreach_campaigns, social_posts, payments`

wa-bulk-ai-panel (`mgnawlfjxtkpnbjhkvis`) was restored to its original 10 tables — untouched.

## ✅ Verification log

| Check | Result |
|---|---|
| `npm run build` | Pass, 13 routes |
| `/`, `/about`, `/pricing`, `/sign-up`, `/sign-in`, `/line` | 200 |
| `POST /api/milo/chat` | 200, real Milo reply |
| `POST /api/sites/generate` | 200, structured site JSON |
| Supabase signup → `profiles` row | Created, then test user deleted |

## 🔧 Known gaps

- `OPENAI_API_KEY` empty → Milo uses built-in demo replies (works, but not live GPT).
- Stripe keys empty → `/api/checkout` returns "not configured".
- Next.js upgraded 15.0.3 → **15.5.29** because Vercel blocks builds on vulnerable versions (CVE-2025-66478).
