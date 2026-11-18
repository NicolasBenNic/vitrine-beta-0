# Contratos técnicos do Beta: API, dados e segurança

**Fonte:** `server.mjs`, `public/app.js`, `README.md` e migração de testers na branch `main` do Beta. **Não são contratos já aprovados para o Mini.**

## 1. Rotas HTTP implementadas

| Método | Endpoint | Acesso | Comportamento / entrada principal |
| --- | --- | --- | --- |
| GET | `/api/health` | Público | `{status,ready,version}`; `ready` verifica **presença de variáveis**, não saúde do Supabase |
| POST | `/api/auth/login` | Público | `{email,password}`; define cookies de sessão |
| POST | `/api/auth/logout` | Sessão | Limpa cookies no navegador |
| POST | `/api/auth/register` | Convite válido | `{email,password,businessName,invite}` |
| GET | `/api/me` | Autenticado | Retorna `user` (com `isAdmin`, `isTester`), `business`, `items` |
| PUT | `/api/business` | Proprietário | `{name,description,whatsapp,logo_path}` |
| POST | `/api/publish` | Proprietário | `{publish:true/false}` |
| POST | `/api/items` | Proprietário | `{name,category,description,price_cents,image_path}` |
| PATCH | `/api/items/:id` | Proprietário | Campos alterados; `confirmPrice:true` se mudar preço |
| DELETE | `/api/items/:id` | Proprietário | JSON `{confirm:true}` obrigatório |
| POST | `/api/upload` | Autenticado | Corpo **binário** JPG/PNG/WebP; `Content-Type` correto |
| GET | `/api/public/:slug` | Público | Negócio publicado + itens `is_active=true` |
| GET | `/api/admin/invites` | Admin | Lista convites sem token em claro |
| POST | `/api/admin/invites` | Admin | `{email}`; devolve link com token de uso único |
| GET | `/v/:slug` | Público | SPA; a busca de dados ocorre por `/api/public/:slug` |

### Exemplos ilustrativos

~~~http
POST /api/items
Content-Type: application/json
Cookie: vitrine_at=<cookie_http_only>

{
  "name": "Corte masculino",
  "category": "Cortes",
  "description": "Corte e finalização",
  "price_cents": 6000,
  "image_path": null
}
~~~

~~~http
POST /api/publish
Content-Type: application/json

{"publish": true}
~~~

~~~http
GET /api/public/barbearia-exemplo-a1b2c3

{
  "business": {
    "id": "...",
    "name": "Barbearia Exemplo",
    "slug": "barbearia-exemplo-a1b2c3",
    "description": "...",
    "whatsapp": "...",
    "is_published": true,
    "logo_url": "..."
  },
  "items": [
    {"id":"...","name":"Corte masculino","category":"Cortes",
     "description":"...","price_cents":6000,"image_url":"..."}
  ]
}
~~~

Os exemplos acima **não são dados reais**. O formato da resposta pode incluir mais campos, como `logo_path` e `image_path`.

### Regras existentes

- Preço é inteiro em centavos, de 0 a 100.000.000 no backend.
- Máximo de 200 itens por vitrine.
- Publicação exige ao menos um item; a rota pública filtra itens ativos.
- Slug gerado a partir do nome + sufixo aleatório; rota pública é `/v/:slug`.
- Exclusão e mudança de preço exigem confirmação explícita.
- Upload aceita JPG/PNG/WebP até 10 MB, com verificação básica da assinatura do arquivo.
- Convite é associado a email, expira em 14 dias, token salvo como SHA-256 e consumido no registro.

## 2. Modelo de dados observado/inferido

**Atenção:** o Supabase estava inativo na verificação de 18/11/2026. Apenas a migração `beta_testers` está versionada no repositório. Os demais campos são inferidos do uso no código e do README, não um dump do DDL.

### `auth.users` (Supabase Auth)

Usuários e credenciais administrados pelo Supabase; o backend obtém `id` e `email` de sessão validada.

### `public.businesses`

Campos usados no código: `id`, `owner_id`, `name`, `slug`, `description`, `whatsapp`, `logo_path`, `is_published`, `updated_at`. O backend cria uma vitrine padrão se necessário. Índice único por `owner_id` foi aplicado anteriormente; confirmar no banco.

### `public.catalog_items`

Campos usados: `id`, `business_id`, `name`, `category`, `description`, `price_cents`, `image_path`, `is_active`, `position`, `created_at`.

### `public.beta_invites`

Campos usados: `id`, `email`, `token_hash`, `expires_at`, `used_at`, `created_at`. Acesso de administração via backend com chave privilegiada.

### `public.beta_testers`

**Migração versionada:** `user_id uuid PK` referenciando `auth.users(id)`, `email text unique`, `enabled boolean`, `created_at timestamptz`, `notes text`. RLS habilitada, política de SELECT para o próprio usuário. Ser tester **não altera** permissão de edição ou login; a aplicação apenas exibe selo.

### Storage

Bucket público `vitrine-media`. Caminho de upload `<user_id>/<uuid>.<jpg|png|webp>`. O backend usa a chave de serviço para upload e constrói URL pública para exibição.

## 3. Controles de segurança observados

- Cookies `HttpOnly`, `SameSite=Lax`, `Secure` em produção.
- Sessão validada por Supabase Auth; refresh token usado para renovar.
- Proteção de origem em operações mutáveis e cabeçalhos de segurança (CSP, X-Frame-Options, nosniff).
- Rate limit **em memória** por IP para login, registro, upload e convites.
- Verificação no backend de proprietário em leitura/edição de negócio e itens.
- Serviço Supabase com chave `service_role` **apenas no backend**.
- RLS declarada no README para negócios e itens; **políticas reais precisam ser verificadas** após reativação do banco.

## 4. Riscos / dívidas técnicas

1. **Chave de serviço privilegiada:** se for vazada, o impacto é alto; não colocar no frontend/AI Studio.
2. **Schema incompleto no Git:** faltam migrações de `businesses`, `catalog_items`, `beta_invites` e Storage; reconstrução do zero não está garantida.
3. **Storage público:** despublicar vitrine não revoga automaticamente URLs diretas de mídia já divulgadas.
4. **Logout:** limpa cookies, mas o código não demonstra revogação explícita de sessões no Supabase.
5. **Rate limiting local:** não é distribuído nem persistente; limitado em escala.
6. **CSRF:** existe validação de origem, mas não há token CSRF dedicado; revisar conforme arquitetura final.
7. **Validação de vídeo:** inexistente; precisa ser desenhada antes de abrir upload.
8. **Estado do banco:** `INACTIVE` na verificação; antes de mudar o schema, conferir estado e fazer backup apropriado.

## 5. Regras para o Mini

- Preferir migrações versionadas e ambientes separados de desenvolvimento/produção.
- Manter autorização por proprietário no backend **e** RLS compatível.
- Para vídeo, usar armazenamento persistente, controle de acesso e entrega eficiente.
- Não reutilizar diretamente a chave `service_role` no cliente gerado pelo AI Studio.
- Revisar política de publicação, dados de endereço e consentimento antes de exibir dados públicos.
- Testar tentativas de acesso cruzado entre dois usuários e leitura de rascunhos por visitante.
