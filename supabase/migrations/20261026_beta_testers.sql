-- Registro de testers internos do Vitrine Beta.
-- Execute apenas uma vez (já aplicado ao projeto Supabase vitrine-beta).
-- Dados de usuários reais não ficam neste arquivo de migração.
create table if not exists public.beta_testers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  notes text not null default ''
);
alter table public.beta_testers enable row level security;
create policy "beta_testers_read_own" on public.beta_testers
  for select to authenticated
  using (user_id = (select auth.uid()));
