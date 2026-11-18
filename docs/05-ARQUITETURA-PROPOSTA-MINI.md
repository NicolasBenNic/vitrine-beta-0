# Arquitetura proposta — Vitrine Mini (NÃO IMPLEMENTADA)

Este é um desenho técnico inicial para discussão com o desenvolvedor. **Não é o estado do código do Google AI Studio**, que ainda não foi disponibilizado para inspeção. Nenhuma migração deste documento foi aplicada ao Supabase.

## 1. Decisão de base técnica

Antes de escolher framework, comparar:
- Código do **Google AI Studio** (exportação necessária).
- Beta atual em Node/HTML/CSS/JS.
- Objetivo: entregar o menor fluxo completo e confiável para celular.

Evitar reescrever por preferência de framework. Priorizar facilidade de manutenção, persistência, segurança, upload de vídeo e velocidade de teste.

### Arquitetura lógica desejada

~~~text
Proprietário (web mobile)
    -> UI cadastro empresa / itens / publicação
    -> camada de API autenticada
    -> Supabase Auth + Postgres + Storage

Visitante (sem login)
    -> /v/:slug
    -> endpoint/consulta somente de vitrine publicada
    -> fotos/vídeos autorizados para entrega pública
    -> WhatsApp
~~~

**Importante:** se o frontend do AI Studio rodar só no navegador, nunca embutir a chave `service_role`. Usar Supabase com chave publicável + RLS ou um backend que faça validação de sessão e autorização. A escolha depende do código recebido.

## 2. Evolução do modelo de dados (proposta)

### Empresa / perfil

Reaproveitar `businesses` se a base for o Beta. Campos novos sugeridos:

| Campo | Tipo lógico | Finalidade |
| --- | --- | --- |
| `business_type` | texto | Barbearia, salão etc. |
| `address_line` | texto | Endereço informado |
| `city`, `state` | texto | Localização |
| `about` | texto | Contexto e história do negócio |
| `customer_promise` | texto | O que quer entregar ao cliente |
| `brand_personality` | enum/texto validado | Sofisticada, moderna, acolhedora, criativa |
| `theme_id` | identificador | Tema selecionado |
| `theme_overrides` | JSON validado | Ajustes manuais de cores/tipografia |
| `headline` | texto | Título público revisado pelo dono |
| `intro_text` | texto | Texto público revisado pelo dono |

Decidir se `address_line` fica visível ao público; por padrão, não divulgar endereço exato sem escolha explícita do proprietário.

### Itens

Reaproveitar `catalog_items` para `business_id`, `name`, `description`, `price_cents`, `category`, `position`, `is_active`.

### Mídia por item (nova tabela proposta)

`item_media`:
- `id` UUID.
- `item_id` UUID referenciando o item.
- `owner_id` UUID para checagem de autorização (ou derivar por relação).
- `kind` = `image` ou `video`.
- `storage_path` (não confiar em URL arbitrária enviada pelo cliente).
- `poster_path` opcional para capa do vídeo.
- `mime_type`, `size_bytes`, `duration_seconds` quando pertinente.
- `position` inteiro; `is_cover` booleano.
- `created_at`.

Criar índice por `item_id, position`. Definir exclusão em cascata e limpeza dos objetos Storage; excluir linha SQL não remove automaticamente o arquivo.

**Não aplicar este desenho como migração sem validar o schema existente.**

## 3. Personalização visual baseada em contexto

### Versão 1: temas determinísticos (recomendada)

- Entradas: `business_type`, `about`, `customer_promise`, `brand_personality`.
- Seleção de tema entre **4 presets**: clássico/sofisticado, moderno/urbano, acolhedor/natural, criativo/expressivo.
- Tokens de tema: fundo, texto, cor de ação, fonte editorial, raio de card, densidade de espaçamento e tratamento da capa.
- Headline e introdução: sugerir textos simples a partir de modelos; proprietário aprova e pode editar.
- Persistir **tema selecionado** e **overrides**, não apenas a inferência em tempo de renderização.
- Mudança de contexto não deve destruir personalizações já feitas.

### Evolução futura: IA opcional

Se o fundador optar por IA, gerar uma proposta **estruturada e validada** (por exemplo `theme_id`, `headline`, `intro_text`), nunca HTML/CSS arbitrário executado diretamente. Validar comprimento, conteúdo e whitelist de tokens. Oferecer fallback determinístico quando o modelo falhar ou houver custo.

## 4. Upload e entrega de vídeo

O Beta atual só aceita imagens de até 10 MB por um endpoint binário. Para o Mini:

1. Definir formatos e limites reais a partir do plano de Storage e dos aparelhos de teste.
2. Validar MIME, assinatura e tamanho no servidor/storage; considerar duração e codecs.
3. Preferir upload direto ao Storage **com autorização segura** (por sessão/RLS ou URL de upload assinada), em vez de trafegar vídeos grandes pelo servidor HTTP simples.
4. Gerar ou pedir imagem de capa/poster; não iniciar todos os vídeos simultaneamente.
5. Na vitrine pública, usar `playsinline`, `muted` por padrão, controles de pausa e carregamento sob demanda.
6. Testar gravações de Android e iPhone, especialmente MP4/H.264 e orientação vertical.
7. Definir exclusão/retensão de mídia e visibilidade de arquivos de rascunho.

**Limites de vídeo (tamanho, duração, quantidade): ainda em aberto.** Não assumir capacidade ilimitada de plano gratuito.

## 5. Autorização e publicação

- O proprietário autentica para editar; visitante não autentica para visualizar.
- Acesso a empresas, itens e mídia sempre limitado ao proprietário no editor.
- Rota pública retorna apenas `is_published = true` e itens ativos.
- Conteúdo privado não deve aparecer em endpoints públicos nem em previews indexáveis.
- Não usar email digitado pelo cliente como prova de propriedade; usar identidade autenticada.
- O perfil de tester não concede privilégios sobre dados de outras empresas.
- Convites do Beta podem ser mantidos como mecanismo de entrada no piloto, **se decidido**; não são uma quarta tela essencial do Mini.

## 6. UI/UX e componentes

- Componentes reaproveitáveis: `BusinessForm`, `BrandThemePreview`, `ItemEditor`, `MediaUploader`, `VitrineFeed`, `PublishPanel`.
- A prévia e a página pública devem compartilhar `VitrineFeed` e os mesmos tokens de tema.
- Separar dados de negócio, layout, upload e publicação para facilitar manutenção.
- Manter design tokens (DM Sans, DM Mono, Playfair Display; off-white/lime/roxo; bordas suaves).
- Considerar navegação simples por etapa, com salvamento explícito ou autosave confiável.

## 7. Migração segura do Beta (se for reutilizado)

1. Backup/export do schema e dados após reativar Supabase.
2. Versionar migrações ausentes.
3. Adicionar campos novos à empresa sem quebrar dados antigos.
4. Criar `item_media` e migrar `catalog_items.image_path` para primeira mídia.
5. Ajustar API/Storage para vídeo; preservar leitura de itens antigos.
6. Atualizar frontend e testes; testar publicação com dados reais de homologação.
7. Planejar rollback e evitar alterar produção diretamente durante o teste.

**Se a base escolhida for o AI Studio**, elaborar plano equivalente após inspecionar seu código e integrações. Não pressupor compatibilidade de schema.
