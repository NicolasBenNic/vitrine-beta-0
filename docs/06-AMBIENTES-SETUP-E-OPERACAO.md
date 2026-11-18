# Ambientes, execução, deploy e operação

**Referência:** Beta existente. Para o Mini, confirmar a base técnica escolhida antes de reaproveitar comandos.

## 1. Pré-requisitos

- Node.js **22 ou superior**.
- Acesso de colaborador ao repositório privado `NicolasBenNic/vitrine-beta-0`.
- Acesso apropriado ao projeto Supabase e ao serviço Render (sem compartilhar senha pessoal).
- Credenciais configuradas por variáveis de ambiente, **nunca no Git**.
- Um celular Android e, se possível, um iPhone para QA.

## 2. Executar o Beta localmente

~~~bash
git clone git@github.com:NicolasBenNic/vitrine-beta-0.git
cd vitrine-beta-0

npm run check
npm test

# O app não carrega .env automaticamente no npm start.
# Node 22 aceita --env-file:
cp .env.example .env
# Preencha .env localmente com credenciais de DESENVOLVIMENTO.
node --env-file=.env server.mjs
~~~

Abrir `http://localhost:3000`. Para teste pelo celular na mesma rede, será necessário expor o servidor de desenvolvimento com configuração segura e ajustar URL/cookies conforme o ambiente. Para teste mais simples, usar o endereço HTTPS de homologação.

O repositório não declara dependências npm externas; `npm install` não é necessário para executar os scripts atuais.

## 3. Variáveis de ambiente do Beta

| Nome | Obrigatória para operação real? | Uso |
| --- | --- | --- |
| `SUPABASE_URL` | Sim | URL HTTPS do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave privilegiada **somente backend** |
| `VITRINE_ADMIN_EMAIL` | Para administrar convites | Email autorizado a gerar convites |
| `NODE_ENV` | Recomendado `production` no Render | Cookies Secure e ambiente |
| `PORT` | Configurada pelo host ou padrão 3000 | Porta HTTP |
| `NODE_VERSION` | Definida no Render | Runtime Node 22 |

Não copiar chave `service_role` para o Google AI Studio, frontend, prompt, documentação, issue ou chat. Para o dev, conceder permissões no painel de cada serviço; usar ambientes separados sempre que possível.

## 4. Deploy do Beta no Render

Arquivo versionado: `render.yaml`.

- Plano `free`.
- Branch `main`.
- Build: `npm run check`.
- Start: `npm start`.
- Health: `/api/health`.
- Deploy automático a cada commit.
- URL conhecida: https://vitrine-beta-0.onrender.com

**Importante:** `/api/health` com `ready:true` indica que URL e chave estão presentes, **não** que Auth, Postgres ou Storage estejam respondendo. Criar smoke test autenticado em homologação quando a base voltar.

O Render Free pode suspender o serviço em inatividade. Não usar disco local do Render para persistir mídia.

## 5. Situação do Supabase em 18/11/2026

O projeto `vitrine-beta` (ref. `uxoxxkufmqtkgyvpynyy`) retornou `INACTIVE` na consulta de status. A tentativa de listar tabelas falhou por indisponibilidade do banco. Antes de qualquer integração:

1. Abrir o painel do Supabase e verificar se o projeto está pausado/inativo.
2. Retomar o projeto, se permitido pelo plano.
3. Confirmar `Auth`, `public.businesses`, `public.catalog_items`, `public.beta_invites`, `public.beta_testers` e bucket `vitrine-media`.
4. Validar políticas RLS e permissões de Storage.
5. Fazer backup e exportar esquema/migrações **antes** de alterar tabelas.
6. Confirmar a conectividade pelo fluxo de login e leitura do negócio.

**Não interpretar o último deploy `live` do Render como confirmação de saúde do banco.**

## 6. Conta de administrador, convites e testers no Beta

- Administrador: usuário criado no Supabase Auth com email igual a `VITRINE_ADMIN_EMAIL`.
- Convites: aba do painel restrita ao admin, email do destinatário, link de uso único válido por 14 dias, envio manual.
- Tester: conta já existente marcada em `public.beta_testers`; selo no painel. O cadastro de tester não substitui Auth e não amplia permissões.
- Visitante da vitrine publicada: não precisa de conta.

O piloto com barbeiro pode continuar com convites, mas isso é decisão de produto para o Mini.

## 7. Testes existentes

~~~bash
npm run check    # node --check server.mjs e public/app.js
npm test         # smoke test offline de HTTP, arquivos e bloqueios básicos
~~~

GitHub Actions: `.github/workflows/check.yml`, Node 22. Última execução consultada no repositório passou em 26/10/2026.

**Cobertura limitada:** testes offline não validam login real, upload no Supabase, RLS, links públicos em celulares, nem vídeo. Criar testes de integração e QA manual para o Mini.

## 8. Fluxo de colaboração recomendado

- Convidar o dev como colaborador do repositório privado, sem divulgar credenciais.
- Criar branch de feature ou novo repo para o Mini após decidir a base.
- Pull requests com descrição, screenshots mobile, migrações, testes e plano de rollback.
- Evitar commits diretos na produção do Beta durante experimentos com o AI Studio.
- Configurar secrets no provedor de deploy, não em arquivos versionados.
- Atualizar documentação quando mudar API, schema ou decisões de escopo.

## 9. Checklist de incidente

- **Tela abre, login falha:** checar status Supabase, Auth, chave e logs do Render.
- **Upload falha:** checar bucket, limite, MIME, políticas e tamanho.
- **Link retorna indisponível:** checar `is_published`, slug e itens ativos.
- **Mudanças não aparecem:** checar deploy da branch correta, cache, persistência e resposta da API.
- **Vídeo não toca (Mini):** checar codec, `Content-Type`, URL, política de Storage, tamanho e `playsinline`.

Registrar erro e contexto sem anexar tokens, cookies ou dados privados.
