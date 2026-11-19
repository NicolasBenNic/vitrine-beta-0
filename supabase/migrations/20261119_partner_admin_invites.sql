-- Evolução do fluxo de convites do Vitrine Beta: empresa x sócio.
-- NÃO foi aplicada ao Supabase de produção nesta branch.
alter table public.beta_invites
  add column if not exists invite_role text not null default 'business';
alter table public.beta_invites
  add constraint beta_invites_role_check
  check (invite_role in ('business', 'coadmin'));
comment on column public.beta_invites.invite_role is
  'business = proprietário de vitrine; coadmin = sócio com acesso à Central ADM mediante convite emitido pelo founder';
-- RLS já está ativa e sem políticas nesta tabela; operações continuam pelo servidor com service role.
