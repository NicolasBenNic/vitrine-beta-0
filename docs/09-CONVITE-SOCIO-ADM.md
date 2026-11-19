# Convite de sócio com acesso ADM — documentação técnica

## Objetivo

Permitir que o fundador conceda ao sócio acesso próprio às cinco telas da Central ADM, sem compartilhar login ou variáveis do Render. O sócio pode acompanhar Resumo, Negócios, Convites Beta, Testers e Sistema; não pode gerar convites de novos administradores nem revogar o acesso de outros sócios.

## Como funcionará após publicação

1. O fundador entra na Central ADM → Convites Beta.
2. Em **Tipo de acesso**, escolhe **Sócio · Central ADM**, informa o e-mail e gera o link de uso único.
3. Envia o link somente ao sócio, por canal privado. O sistema não manda e-mails automaticamente.
4. O sócio abre o link, informa o e-mail do convite e:
   - Se já tiver conta no Vitrine, usa sua senha atual.
   - Se não tiver, define uma senha de 10 a 128 caracteres.
5. O backend verifica token, e-mail, data de validade e uso único, e só então registra o papel `coadmin` em **Supabase Auth app_metadata**, que não é alterável pelo próprio usuário.
6. O sócio acessa as mesmas telas ADM pela conta dele.
7. O fundador consegue visualizar e **revogar acesso ADM** na mesma área de Convites Beta. A conta e a vitrine do sócio não são excluídas.

**Convites comuns continuam criando apenas contas de negócio.** Passar `role:coadmin` por uma requisição feita por usuário comum não concede privilégios; a API exige o e-mail do fundador, verificado via Supabase Auth.

## Separação de papéis

- **founder:** determinado pelo e-mail `VITRINE_ADMIN_EMAIL` configurado no Render. Tem todas as ações administrativas e é o único que emite convites de sócio e revoga privilégios.
- **coadmin:** papel concedido exclusivamente pela API protegida em `app_metadata.vitrine_role`. Acessa as cinco telas administrativas, inclusive gestão de convites comuns, mas não pode adicionar sócios.
- **business:** usuário convidado comum, com acesso apenas à sua vitrine.
- **tester:** classificação para testes; não concede acesso ADM.

## Mudança no banco (pendente de aprovação)

Arquivo: `supabase/migrations/20261119_partner_admin_invites.sql`. Inclui `public.beta_invites.invite_role` com padrão `business` e valores permitidos `business`, `tester` ou `coadmin`.

**A migração foi aplicada e verificada no Supabase de produção em 19/11/2026.** O código não deve ser mesclado à `main` antes da aplicação da migração e de uma validação integrada.

## API

- `POST /api/admin/invites` — aceita `role:'coadmin'` **somente para founder** e cria link `/?invite=...&partner=1`.
- `POST /api/auth/partner-accept` — recebe e-mail, senha e token e concede `app_metadata.vitrine_role='coadmin'` após validar o convite.
- `GET /api/admin/partners` — lista sócios com privilégios, apenas founder.
- `POST /api/admin/partners/:userId/revoke` — remove privilégios, com `confirm:true`, apenas founder.

A versão atual das demais rotas administrativas continua disponível ao founder e ao coadmin por meio de `isAdmin(user)`.

## Segurança e limitações

- O link de convite funciona como **credencial de posse**. Não encaminhar, publicar ou colocar em prints; alguém com o link pode tentar ativar a conta do e-mail convidado caso esse e-mail ainda não tenha cadastro. O fluxo atual **não comprova separadamente a propriedade da caixa postal** de uma conta nova; exigir confirmação de e-mail no Supabase antes de escalar o recurso.
- A implementação foi testada em ambiente simulado; não foi testada no Supabase real nem publicada.
- A concessão em Auth e a marcação de uso do convite são operações em APIs diferentes, sem transação única; existe tratamento de erro e tentativa de reversão, mas um incidente raro pode exigir correção administrativa manual.
- A revogação é consultada por `/auth/v1/user` a cada requisição da API; podem existir caches ou sessões externas com dados antigos. Testar revogação em navegador real.
- Um admin não recebe acesso ao painel do projeto Supabase ou Render; recebe apenas a Central ADM web.
- Novas contas são criadas pelo Supabase Auth Admin com `email_confirm:true`. Isso dispensa comprovação por e-mail no cadastro inicial, portanto requer um canal de entrega confiável e é apropriado apenas a um beta pequeno e fechado.
- Contas existentes precisam provar a senha da conta para usar o convite.
- Antes do deploy: backup, aplicar migração, executar testes, publicar, validar conta convidada, confirmar que convites normais não promovem admins, testar revogação.

## Testes

`npm run check` e `npm test` no GitHub Actions. O arquivo `tests/partner-invite.test.mjs` usa `tests/mock-supabase.mjs` e valida emissão founder-only, e-mail vinculado, token de uso único, login próprio, bloqueio de promoção por conta comum e revogação de acesso. Não utiliza credenciais de produção.
