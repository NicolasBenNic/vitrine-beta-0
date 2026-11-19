-- Evolução do fluxo de convites do Vitrine Beta: empresa x sócio x tester.
-- NÃO foi aplicada ao Supabase de produção nesta branch.
alter table public.beta_invites
  add column if not exists invite_role text not null default 'business';
alter table public.beta_invites
  add constraint beta_invites_role_check
  check (invite_role in ('business', 'coadmin', 'tester'));
comment on column public.beta_invites.invite_role is
  'business = convite legado para negócio; tester = piloto com vitrine própria; coadmin = administração';
-- RLS já está ativa e sem políticas nesta tabela; operações continuam pelo servidor com service role.
