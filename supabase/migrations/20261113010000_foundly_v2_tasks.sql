-- Foundly v2: environments (Home / Build / Run), task engine, credits, automations, integrations

-- ---------- profiles: plans + credits ----------
alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists credits int not null default 15,
  add column if not exists full_name text,
  add column if not exists business_name text,
  add column if not exists onboarding jsonb not null default '{}';

-- ---------- tasks: everything Milo executes ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null default 'build' check (environment in ('home','build','run')),
  kind text not null,
  title text not null,
  detail text,
  status text not null default 'queued'
    check (status in ('queued','running','needs_approval','approved','rejected','done','failed')),
  credit_cost int not null default 1,
  result jsonb,
  error text,
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_created_idx on public.tasks (user_id, created_at desc);

-- ---------- automations: scheduled / autopilot work ----------
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null,
  cadence_hours int not null default 168,
  autopilot boolean not null default false,
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists automations_due_idx on public.automations (enabled, next_run_at);

-- ---------- documents: plans, decks, price lists ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  content text not null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- integrations: connected apps ----------
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  category text not null,
  status text not null default 'available' check (status in ('available','connected','error')),
  connected_at timestamptz,
  unique (user_id, slug)
);

-- ---------- credit ledger ----------
create table if not exists public.credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists credit_events_user_idx on public.credit_events (user_id, created_at desc);

-- ---------- activity feed ----------
create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.tasks enable row level security;
alter table public.automations enable row level security;
alter table public.documents enable row level security;
alter table public.integrations enable row level security;
alter table public.credit_events enable row level security;
alter table public.activity enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tasks','automations','documents','integrations','credit_events','activity']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();
