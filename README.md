# Foundly

**An AI employee for anyone with an idea.**

Foundly is an AI platform where **Milo**, your AI employee, turns your idea into something real, runs the business for you, and helps it earn.

> Inspired by the idea-to-profit workflow (idea → site → outreach → social → payments), built from scratch with your own brand and code.

## What Milo does

- Builds your website and puts it online
- Makes your logo and business email (roadmap)
- Writes to stores and customers (drafts you approve)
- Drafts your social posts
- Sets up a way to get paid through Stripe

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (Auth + Postgres)
- **Stripe** (Checkout + webhooks)
- **OpenAI-compatible AI** for Milo (works in demo mode without a key)

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
npm run dev                  # http://localhost:3000
```

### 1. Supabase setup
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/20261113000000_foundly_init.sql` in SQL Editor
3. Copy Project URL + anon key into `.env.local`

### 2. Stripe setup (optional for v1)
1. Create a product + price at [stripe.com](https://stripe.com), copy the Price ID
2. Add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, webhook secret to `.env.local`
3. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### 3. AI (optional)
Add `OPENAI_API_KEY` for real Milo replies. Without it, Milo runs in demo mode with built-in smart replies.

## Routes

| Route | What it is |
|---|---|
| `/` | Marketing home |
| `/about` | Company + mission |
| `/pricing` | Plans |
| `/sign-up` `/sign-in` | Supabase auth |
| `/line` | Milo workspace: chat, sites, outreach, social, payments |
| `/api/milo/chat` | Milo chat API |
| `/api/sites/generate` | Generate site from idea |
| `/api/checkout` | Stripe checkout |
| `/api/webhooks/stripe` | Stripe webhook |

## Deploy

Push to GitHub, then import to Vercel. Add env vars in Vercel dashboard.

```bash
git init
git add .
git commit -m "feat: Foundly v1 — Milo idea-to-business platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/foundly.git
git push -u origin main
```

## License

MIT — build your own business with it.
