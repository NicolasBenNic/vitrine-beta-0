# Central ADM — release das cinco etapas

Estado: implementada na branch de feature, validada por testes offline com integração simulada; publicação só ocorre após merge para `main`.

## Telas do administrador

As áreas aparecem apenas quando `user.isAdmin` é verdadeiro; o backend valida de forma independente o email da sessão verificada pelo Supabase contra `VITRINE_ADMIN_EMAIL`.

| Área | Conteúdo | API |
| --- | --- | --- |
| Resumo ADM | 5 contagens (negócios, publicadas, rascunhos, convites pendentes, testers ativos) | `GET /api/admin/summary` |
| Negócios | Busca, filtro, detalhes, links e retirada de vitrine do ar com confirmação | `GET /api/admin/businesses`, `POST /api/admin/businesses/:id/unpublish` |
| Convites | Pendentes, usados, expirados, cancelados, busca, gerar convite individual | `GET/POST /api/admin/invites`, `POST /api/admin/invites/:id/cancel` |
| Testers | Lista, busca, cadastro de contas existentes, notas, status ativo/inativo | `GET/POST /api/admin/testers`, `PATCH /api/admin/testers/:userId` |
| Sistema | Checagens pontuais de aplicação, dados, Auth, Storage; últimos registros e atalhos | `GET /api/admin/system` |

## Regras de segurança

- Todas as APIs administrativas exigem sessão autenticada e `isAdmin(user)` no servidor, não só no menu.
- `service_role` permanece apenas no backend.
- Criar tester **não** cria usuário Auth; a pessoa precisa ter uma conta existente. A ativação/desativação de tester muda apenas a classificação; não bloqueia login.
- Ao cancelar convite, a expiração é antecipada para uma data fixa no passado, o que invalida o token sem nova coluna no banco.
- Links secretos dos convites são exibidos apenas após a criação. O histórico não reconstrói tokens.
- Despublicação administrativa exige `confirm:true` e pode ser revertida pelo próprio dono ao publicar novamente.
- Consulta de negócios retorna no máximo 100 por vez; listar responsáveis via Supabase Auth Admin. Escalar requer paginação completa.
- Dados de acesso e saúde do sistema **não** são analytics de visitantes.

## Contratos de dados e disponibilidade

- `beta_testers` tem chave primária `user_id` (não `id`). A contagem do Resumo deve usar `select=user_id`.
- `GET /api/admin/system` executa leituras de negócio/convite, consulta Auth Admin e verifica o bucket `vitrine-media`. Retorna status parcial por componente sem expor segredos.
- O indicador de servidor significa que **esta instância respondeu**; não representa a situação global do Render.
- A atividade “Último acesso desta conta” se refere ao login registrado pelo Supabase Auth para a conta administradora, se disponível.
- Não há monitoramento em background, alerta automático ou histórico de uptime.

## Verificações realizadas

- Sintaxe JS validada no GitHub Actions (`npm run check`).
- Testes HTTP offline (`npm test`), incluindo bloqueio de acesso anônimo.
- Testes integrados com Supabase simulado (`tests/admin-integration.test.mjs`) cobrindo leitura dos indicadores, negócios, convites, testers, saúde e proibição para usuário sem perfil de admin.
- Banco Supabase real consultado **somente para leitura**, esquema e bucket verificados.
- Ainda depende de teste manual autenticado real no navegador e em celular para validar todos os botões e o fluxo visual.

## Publicação e rollback

O Render usa deploy automático da branch `main`. A branch de preview não é produção. Após integrar por PR, verificar status do deploy, `/api/health`, login administrativo e cada aba. Em caso de erro crítico, usar rollback para a implantação anterior no Render e conferir que a versão anterior voltou.

Nenhuma migração de banco é necessária para as cinco telas; elas utilizam o schema existente.
