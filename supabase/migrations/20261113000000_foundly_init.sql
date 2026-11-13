-- Foundly initial schema: Milo's workspace
-- Run in Supabase Dashboard → SQL Editor, or via `supabase db push`

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null default 'Untitled',
  idea text not null,
  content jsonb not null default '{}',
  published_url text,
  created_at timestamptz default now()
);

create table if not exists public.milo_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text,
  draft text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text default 'instagram',
  caption text,
  status text default 'draft',
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_session_id text unique,
  amount_cents int,
  currency text default 'usd',
  status text default 'pending',
  created_at timestamptz default now()
);

-- Row Level Security: users only see their own rows
alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.sites enable row level security;
alter table public.milo_messages enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.social_posts enable row level security;
alter table public.payments enable row level security;

create policy "own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own rows" on public.ideas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.sites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.milo_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.outreach_campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.social_posts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
