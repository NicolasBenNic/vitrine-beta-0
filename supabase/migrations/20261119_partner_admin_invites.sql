-- Roles de convite para o Vitrine Beta.
-- Aplicado ao projeto Supabase de produção em 19/11/2026; mantido para reproduzir o schema.
-- Migração idempotente. Convites legados conservam o papel business.
alter table public.beta_invites
  add column if not exists invite_role text not null default 'business';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_invites_role_check'
      and conrelid = 'public.beta_invites'::regclass
  ) then
    alter table public.beta_invites
      add constraint beta_invites_role_check
      check (invite_role in ('business','coadmin','tester'));
  end if;
end $$;

comment on column public.beta_invites.invite_role is
  'business: convite legado; tester: vitrine própria; coadmin: Central ADM';
-- RLS em beta_invites permanece ativo sem políticas públicas.
-- Convites só são acessados pelo backend autenticado e autorizado.
