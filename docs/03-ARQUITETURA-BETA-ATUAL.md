# Arquitetura implementada — Vitrine Beta existente

**Escopo deste arquivo:** código inspecionado na branch `main` do repositório `NicolasBenNic/vitrine-beta-0`, commit de referência `2b497c485d04cc3a34ad7088c0bceea00a07ac1d` (26/10/2026). Não é a arquitetura do projeto novo do Google AI Studio.

## Stack real

| Camada | Implementação encontrada |
| --- | --- |
| Frontend | HTML, CSS e **JavaScript vanilla**; SPA montada no DOM |
| Backend | Node.js 22+, módulo ESM `server.mjs`, servidor HTTP nativo |
| Autenticação | Supabase Auth; sessões em cookies HttpOnly |
| Dados | Supabase PostgreSQL, acessado pelo backend via REST/PostgREST |
| Mídia | Supabase Storage, bucket público `vitrine-media` |
| Hospedagem | Render Web Service Free, auto-deploy da branch `main` |
| Testes | Node `--test`, verificação de sintaxe; GitHub Actions |
| Bibliotecas npm | **Nenhuma dependência externa** no `package.json` atual |

**Não confundir com o protótipo histórico** (React 19, TypeScript, Vite, Tailwind 4, Wouter e base Express/tRPC/Drizzle). O protótipo histórico está em ZIP no Drive e foi reimplementado em um beta mínimo com outra stack.

## Estrutura do repositório

~~~text
vitrine-beta-0/
├── package.json
├── server.mjs                    # servidor, Auth, API, Supabase e estáticos
├── public/
│   ├── index.html                # entrada da SPA
│   ├── app.js                    # UI, eventos, fetch, navegação e prévia
│   ├── style.css                 # estilos e media queries
│   └── favicon.svg
├── tests/
│   └── offline.test.mjs          # smoke test HTTP e acesso privado
├── supabase/migrations/
│   └── 20261026_beta_testers.sql # SOMENTE a tabela de testers versionada aqui
├── .github/workflows/check.yml
├── render.yaml
├── .env.example
└── README.md
~~~

## Fluxo de requisição

~~~text
Navegador (public/app.js)
    |
    | fetch /api/... com cookies de sessão
    v
Render (server.mjs)
    |--- valida origem, entrada e propriedade
    |--- Auth -> Supabase Auth API
    |--- Dados -> Supabase REST/PostgREST
    |--- Imagem -> Supabase Storage
    v
Supabase (Auth + PostgreSQL + Storage)

Visitante sem login:
GET /v/:slug -> HTML da SPA
GET /api/public/:slug -> apenas negócio publicado e itens ativos
~~~

O backend usa `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no servidor. Por usar uma chave privilegiada, **a autorização por proprietário implementada no servidor é parte essencial da segurança**, não opcional.

## Funcionalidades que de fato existem

- Login, logout e criação de usuário por convite individual.
- Administração de convites de uso único (validade de 14 dias).
- Perfil de tester registrado em `beta_testers` e exibido como selo; não é um papel com privilégios de edição adicionais.
- Uma vitrine/negócio por proprietário no fluxo atual.
- Editar nome, descrição curta, WhatsApp e logo.
- Criar, editar e excluir itens com nome, categoria, descrição, preço e **uma imagem**.
- Upload de JPG/PNG/WebP com tamanho máximo de **10 MB**.
- Publicar/despublicar; URL `/v/:slug`; visualização pública.
- Navegar entre itens, filtrar categoria, favorito **local no navegador do visitante** e CTA WhatsApp.
- Dois comandos de texto simples reconhecidos por regra: “Adicione X por R$ Y” e “Publique”. **Não é chat de IA**.
- Layout responsivo, com DM Sans, DM Mono, Playfair Display, cards suaves.

## Não implementado no Beta (importante para o Mini)

- Upload/reprodução de vídeo.
- Múltiplas mídias por item e reordenação por drag-and-drop.
- Endereço, tipo de negócio, história, promessa ao cliente e tema dinâmico salvos no banco.
- Personalização visual por contexto da empresa.
- Recuperação de senha pelo próprio usuário.
- Envio automático de email de convite.
- Analytics reais (intencionalmente excluídos do escopo).
- Testes automatizados ponta a ponta com Supabase real.
- Aplicativo nativo Android/iOS.

## Dependências e pontos de acoplamento

- `server.mjs` concentra autenticação, API, validações e arquivos estáticos; refatoração pode separar módulos quando necessário, mas não é pré-requisito para validar o Mini.
- `public/app.js` concentra componentes renderizados por string e estado local; mudanças grandes na UI podem justificar um framework, mas a decisão deve considerar o código do AI Studio.
- O servidor acessa o banco pelo endpoint REST do Supabase; **não** usa cliente `supabase-js`.
- A UI e o servidor esperam colunas e tabelas que **não estão todas representadas por migrações no GitHub**. É necessário extrair e versionar o schema real quando o banco voltar a ficar acessível.

## Infraestrutura observada

- Repositório privado, branch `main`.
- Render: `https://vitrine-beta-0.onrender.com`, build `npm run check`, start `npm start`, health check `/api/health`, deploy automático.
- Último deploy conhecido no Render: status `live` para o commit `2b497c4...` em 26/10/2026.
- **Supabase em 18/11/2026: `INACTIVE`.** Não foi possível confirmar ao vivo as tabelas, políticas, usuários ou bucket nessa data. Os detalhes de schema abaixo são derivados do código/README e da migração versionada, não de consulta SQL atual.

## Evolução recomendada

Tratar o Beta como **referência técnica e de UX**, não como obrigação de reutilizar toda a implementação. A decisão de migrar o Mini para esta base ou para o código do AI Studio deve ocorrer após comparação dos dois projetos e um teste mobile real.
