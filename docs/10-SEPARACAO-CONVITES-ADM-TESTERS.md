# Vitrine Beta — separação de convites ADM / Testers

**Status:** implementado na branch `feat/separar-convites-adm-testers`, aguardando migração de produção e publicação. **Não está ativo no site público**.

## 1. Regra de produto

- **Resumo ADM (fundador):** emite convites `coadmin`. Após aceitação, o convidado usa uma conta própria e acessa as cinco áreas operacionais (Resumo, Negócios, Testers, Sistema e funções administrativas correspondentes). O fundador mantém exclusividade para convidar ou revogar outros administradores.
- **Testers (administrador):** emite convites `tester`. Após o cadastro, a pessoa recebe uma vitrine **só dela**, pode editar seus serviços e mídia, mas não consulta dados privados de empresas alheias e não acessa nenhuma API administrativa.
- **Convites comuns históricos (`business`):** continuam válidos e criam uma conta de negócio comum, mas a criação agora aparece separada nas telas de ADM e de Testers. O menu genérico “Convites beta” foi retirado da navegação.
- **Conta existente:** pode ser marcada como tester pela seção recolhida “O usuário já tem conta?”. O convite `tester` normal é destinado a um novo cadastro.
- **Link público:** vitrines publicadas continuam visíveis para visitantes sem login, inclusive testers. Isso não equivale a permissão para editar ou acessar rascunhos de terceiros.

## 2. Fluxo técnico

### Convite ADM

`POST /api/admin/invites`, `role:'coadmin'` → somente `isFounder` → token SHA-256 no banco, link `/?invite=<token>&partner=1` → `POST /api/auth/partner-accept` → valida e-mail/token/expiração → grava `app_metadata.vitrine_role='coadmin'` no Supabase Auth. As APIs verificam a permissão no backend.

### Convite tester

`POST /api/admin/invites`, `role:'tester'` → exige `isAdmin` → link `/?invite=<token>&tester=1` → `POST /api/auth/register` → valida e-mail/token/expiração e o papel **salvo no banco** → cria usuário Auth, vitrine própria e registro `public.beta_testers` habilitado. O valor de papel enviado no JSON do cliente **não concede permissões**.

Ambos os convites duram 14 dias, são vinculados ao e-mail e de uso único. O link em texto claro só é exibido após a geração. A pessoa recebe o link manualmente (WhatsApp, por exemplo).

## 3. Separação de acesso

| Ação | Fundador | Coadmin | Tester | Visitante |
| --- | :---: | :---: | :---: | :---: |
| Criar convite ADM | Sim | Não | Não | Não |
| Criar convite tester | Sim | Sim | Não | Não |
| Ver Resumo/Negócios/Testers/Sistema | Sim | Sim | Não | Não |
| Gerir a própria vitrine | Sim | Sim | Sim | Não |
| Editar dados privados de outra empresa pelo editor | Não (por padrão) | Não | Não | Não |
| Moderar/despublicar vitrines pelo painel ADM | Sim | Sim | Não | Não |
| Visualizar vitrine publicada | Sim | Sim | Sim | Sim |

**Atenção:** a área ADM tem funções explícitas de monitoramento/moderação de empresas. Isso não autoriza editar os itens de terceiros pelo editor comum.

O Supabase usa RLS por `businesses.owner_id = auth.uid()` e `catalog_items.business_id` pertencente ao dono. A implementação Node usa `service_role` exclusivamente no servidor e faz verificações adicionais com IDs de propriedade para os endpoints do editor.

## 4. Auditoria realizada antes das alterações

- Schema PostgreSQL real consultado.
- RLS ativa em `businesses`, `catalog_items`, `beta_testers` e `beta_invites`.
- Políticas de empresas/itens limitam SELECT, UPDATE, INSERT e DELETE ao proprietário.
- `beta_testers`: SELECT do próprio registro.
- `beta_invites`: nenhuma política pública; acessada pelo backend privilegiado.
- Teste integrado `tests/tenant-isolation.test.mjs` passou em branch de preparação antes da nova lógica: duas empresas simuladas, tester não visualiza ou altera outra empresa; endpoints administrativos devolvem 403.

## 5. Testes automáticos pós-implementação

- `tests/invite-separation.test.mjs`: emissão isolada, filtros por papel, bloqueio de escalação de privilégios e de uso cruzado dos links, cadastro tester, ausência de ADM, token único.
- `tests/partner-invite.test.mjs`: fluxo de coadmin, acesso ADM, exclusividade de emissão e revogação pelo fundador.
- `tests/tenant-isolation.test.mjs`: isolamento entre empresas.
- `tests/ui-role-invites.test.mjs`: tela de cadastro tester, ADM e navegação distinta por papel.
- `tests/admin-integration.test.mjs` e `tests/offline.test.mjs`: acesso administrativo e smoke tests.

Todos usam Supabase **simulado** em processos isolados. Não foram criados usuários nem enviados convites reais em produção.

## 6. Alteração de banco necessária

Arquivo: `supabase/migrations/20261119_partner_admin_invites.sql`.

Adiciona `public.beta_invites.invite_role` com padrão `business` e constraint permitindo `business`, `coadmin` e `tester`. Os convites antigos preservam o comportamento de empresa.

**Não publicar o backend antes de aplicar e verificar essa migração no Supabase real.**

## 7. Checklist para publicação

1. Confirmar backup/exportação do banco e estado `ACTIVE_HEALTHY`.
2. Aplicar migração com papel `invite_role`.
3. Confirmar coluna, default e constraint com SQL.
4. Fazer deploy de branch aprovada, observando Render e GitHub Actions.
5. Testar **em navegador real** três contas distintas: fundador, admin convidado e tester convidado.
6. Confirmar que o tester não vê menu ADM, não acessa endpoints administrativos e não consegue alterar um item de outra empresa.
7. Confirmar token expirado, usado e cancelado.
8. Testar revogação do papel `coadmin`.
9. Verificar logs e preparar rollback.

## 8. Limites e risco de segurança conhecido

A ativação de um **novo** coadmin pelo fluxo herdado de `partner-accept` ainda usa um link privado e cria a conta com `email_confirm:true` via Auth Admin, **sem prova separada de posse da caixa de e-mail**. Quem obtém o link antes do convidado poderia ativar a conta. Para produção aberta, implantar confirmação de e-mail/OTP antes de conceder o papel ADM. Para este beta fechado, compartilhar links exclusivamente por canal privado reduz, mas não elimina, o risco.

`beta_testers.enabled=false` remove o selo/classificação de tester; **não bloqueia o login nem a edição da vitrine**. Restringir ou suspender a conta é uma funcionalidade distinta.

Imagens publicadas continuam em bucket público, pois fazem parte da experiência de visitação. Não tratar URLs públicas como dados secretos.
