-- ============================================================================
-- Foundly v4: "just go" — full autonomy, self-publishing, real money in.
--
-- Three new things, in the order they matter:
--   1. autonomy.auto_publish  — let Milo publish the sites it builds.
--   2. autonomy.auto_send     — let Milo send work that leaves Foundly
--                               (posts, emails, outreach) without asking.
--                               Goes to a release queue with a cool-down so a
--                               bug cannot send 40 things before you see it.
--   3. site_products          — a priced thing on a public site, so the page
--                               has a working Buy button.
--   4. site_orders            — money that actually arrived, from Stripe.
--
-- Safety that is NOT optional (and is enforced in code, not by trust):
--   * auto_send can never be turned on until the user has connected at least
--     one channel that can actually deliver. No channel = nothing to send.
--   * every auto-sent item is capped per day (see DAILY_SEND_CAP).
--   * anything the model marks as a payment/refund/legal action is never
--     auto-sent, no matter what the toggle says.
-- ============================================================================

-- ---------- 1. autonomy switches ----------
alter table public.milo_autonomy
  add column if not exists auto_publish boolean not null default false,
  add column if not exists auto_send boolean not null default false,
  add column if not exists send_cap_per_day int not null default 3,
  add column if not exists risk_ack_at timestamptz;

comment on column public.milo_autonomy.auto_send is
  'When true, work that leaves Foundly is released automatically after a cool-down instead of waiting for approval.';

-- ---------- 2. release queue ----------
-- Every outbound artifact goes through here. With approval on it sits until the
-- owner clicks. With auto_send on, the tick releases it after COOL_DOWN.
create table if not exists public.outbound_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  channel text not null,                    -- provider slug: x, gmail, instagram…
  kind text not null,                       -- social_post | outreach_email | reply
  title text,
  body text,
  status text not null default 'held'
    check (status in ('held','releasing','sent','failed','cancelled','skipped')),
  auto boolean not null default false,      -- was it queued by autonomy?
  release_at timestamptz,                   -- earliest moment auto_send may fire
  released_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists outbound_queue_due on public.outbound_queue (status, release_at);
create index if not exists outbound_queue_user on public.outbound_queue (user_id, created_at desc);

alter table public.outbound_queue enable row level security;

drop policy if exists "own rows" on public.outbound_queue;
create policy "own rows" on public.outbound_queue
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 3. products on a site ----------
create table if not exists public.site_products (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  -- integer minor units. Never a float: money and floating point do not mix.
  price_cents int not null check (price_cents > 0),
  currency text not null default 'usd',
  stripe_price_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists site_products_site on public.site_products (site_id) where active;

alter table public.site_products enable row level security;

drop policy if exists "own rows" on public.site_products;
create policy "own rows" on public.site_products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The public storefront must be readable by anyone, including signed-out
-- visitors, but only the display fields. A separate policy with `true` is safe
-- here because there is nothing private in these columns.
drop policy if exists "public can read active products" on public.site_products;
create policy "public can read active products" on public.site_products
  for select using (active = true);

-- ---------- 4. orders ----------
create table if not exists public.site_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  product_id uuid references public.site_products(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  amount_cents int not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending','paid','refunded','failed')),
  buyer_email text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists site_orders_user on public.site_orders (user_id, created_at desc);

alter table public.site_orders enable row level security;

-- Owners read their own orders. Nobody else can read them at all — buyer email
-- and amounts are private. Writes come from the Stripe webhook via the service
-- role, which bypasses RLS.
drop policy if exists "own rows" on public.site_orders;
create policy "own rows" on public.site_orders
  for select using (auth.uid() = user_id);
