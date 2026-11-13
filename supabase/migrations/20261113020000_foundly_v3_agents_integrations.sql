-- Foundly v3: agent-built websites + real integration connections

-- ---------- sites: hold the generated HTML and a public slug ----------
alter table public.sites
  add column if not exists slug text,
  add column if not exists html text,
  add column if not exists published boolean not null default false,
  add column if not exists agent_run jsonb not null default '[]',
  add column if not exists score int;

create unique index if not exists sites_slug_key on public.sites (slug) where slug is not null;

-- ---------- OAuth tokens: service-role only, never exposed to the browser ----------
create table if not exists public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  access_token text not null,
  refresh_token text,
  token_type text default 'Bearer',
  scope text,
  expires_at timestamptz,
  account_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.integration_tokens enable row level security;
-- No policies on purpose: only the service role (server) may read or write tokens.

-- ---------- published posts log ----------
create table if not exists public.social_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  body text not null,
  external_id text,
  external_url text,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error text,
  created_at timestamptz not null default now()
);
alter table public.social_publications enable row level security;
create policy "own rows" on public.social_publications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- keep integrations table in sync with token presence ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists tokens_touch on public.integration_tokens;
create trigger tokens_touch before update on public.integration_tokens
  for each row execute function public.touch_updated_at();
