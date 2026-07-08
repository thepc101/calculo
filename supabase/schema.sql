-- Calculo Database Schema (Neon PostgreSQL)
-- Paste this entire block into the Neon SQL Editor and run it

-- ============================================================
-- Users (email + password auth)
-- ============================================================
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Profiles (display name, avatar)
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key references public.users(id) on delete cascade,
  email      text not null,
  name       text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Projects
-- ============================================================
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  slug       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slug)
);
create index if not exists idx_projects_user on public.projects(user_id);

-- ============================================================
-- Calculators
-- ============================================================
create table if not exists public.calculators (
  id           text primary key,
  user_id      uuid not null references public.users(id) on delete cascade,
  name         text not null,
  type         text not null default 'scientific',
  theme        jsonb not null default '{"mode":"dark","primaryColor":"#3b82f6","backgroundColor":"#0a0a0b","textColor":"#fafafa"}',
  buttons      jsonb not null default '[]',
  layout       jsonb not null default '{}',
  settings     jsonb not null default '{}',
  display      jsonb not null default '{}',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_calculators_user on public.calculators(user_id);
create index if not exists idx_calculators_published on public.calculators(published_at);

-- ============================================================
-- API Keys (hash only, never plaintext)
-- ============================================================
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  project_id   uuid,
  name         text not null,
  token_hash   text not null unique,
  prefix       text not null,
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_api_keys_hash on public.api_keys(token_hash);
create index if not exists idx_api_keys_user on public.api_keys(user_id);

-- ============================================================
-- Usage Events
-- ============================================================
create table if not exists public.usage_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  calculator_id  text,
  type           text not null,
  count          integer not null default 1,
  metadata       jsonb default '{}',
  created_at     timestamptz not null default now()
);
create index if not exists idx_usage_user on public.usage_events(user_id);
create index if not exists idx_usage_calc on public.usage_events(calculator_id);
create index if not exists idx_usage_created on public.usage_events(created_at);
