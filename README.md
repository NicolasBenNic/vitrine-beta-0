# Vitrine Beta — acesso por convite

Versão beta enxuta e hospedável, independente do protótipo React inicial. O foco é o fluxo real de cadastro privado, configuração de negócio, catálogo de produtos/serviços, upload de fotos e publicação de um link público. Sem Analytics.

## Funcionalidades implementadas

- Login pelo Supabase Auth, cookies de sessão HTTP-only e renovação de sessão.
- Cadastro somente com convite individual de uso único (token salvo como SHA-256).
- Administrador gera links de convite, válidos por 14 dias.
- Cada proprietário gerencia apenas seus próprios negócios e itens (verificações no servidor).
- Criar, editar e excluir serviços, com confirmação de mudança de preço/exclusão.
- Upload permanente de JPG, PNG e WebP de até 10 MB no Supabase Storage.
- Publicar, despublicar, copiar link e visualizar a vitrine pública em celular.
- Favoritos locais no navegador; nenhum evento de analytics é enviado.
- Comandos básicos "Adicione barba por R$ 40" e "Publique", sem API paga de IA.
- Interface responsiva, em português.

Limitações do beta: sem recuperação automática de senha, envio automático de emails, vídeo, domínio próprio, pagamentos, analytics ou sincronização de favoritos entre dispositivos. O frontend foi refeito sem dependências para facilitar o Render gratuito; não é a compilação React original.

## Configurar o Render

Crie um Web Service Free a partir de NicolasBenNic/vitrine-beta-0 ou importe o Blueprint render.yaml. A aplicação usa Node.js 22 e nenhuma dependência NPM.

- Build command: npm run check
- Start command: npm start
- Health check: /api/health
- SUPABASE_URL: https://uxoxxkufmqtkgyvpynyy.supabase.co
- SUPABASE_SERVICE_ROLE_KEY: chave secreta do Supabase, configurada SOMENTE no Render
- VITRINE_ADMIN_EMAIL: email de quem criará convites
- NODE_ENV: production

NUNCA copie a chave secreta para arquivos do GitHub, para o navegador, ou para conversas públicas.

## Preparar o primeiro administrador

No Supabase vitrine-beta, entre em Authentication → Users → Add user. Cadastre manualmente o administrador com o email definido na variável VITRINE_ADMIN_EMAIL, senha forte e email confirmado. Essa pessoa poderá entrar no app e abrir a aba Convites beta para gerar convites. Copie o link e envie ao barbeiro por WhatsApp; ele define sua própria senha.

Cadastro público fica bloqueado na aplicação. Recomenda-se também desabilitar registros abertos nas opções de Email de Supabase Auth, pois este app usa criação de usuários pelo servidor somente mediante convite.

## Cadastro de testers internos

A tabela `public.beta_testers` guarda os usuários autorizados a atuar como testers internos. Sua conta de administrador já foi cadastrada diretamente no Supabase com `enabled = true`; não há nova senha e não foi criada outra conta.

Ao entrar, uma conta tester ativa recebe o selo **Tester · acesso ativo**. O tester continua usando exatamente as funções normais do usuário convidado: editar os dados do negócio, criar/editar/excluir itens, carregar fotos, visualizar, publicar/despublicar e compartilhar. Apenas o administrador mantém o menu de convites.

Cada usuário mantém sua própria vitrine; o cadastro de tester não permite editar vitrines alheias e não altera as regras de convite para novos usuários. O status de tester é consultado no servidor por ID do usuário autenticado.

Para cadastrar outros testers, primeiro crie/convide a conta com o fluxo normal de convites; depois adicione o `auth.users.id` e email correspondente em `public.beta_testers` pelo SQL Editor do Supabase. O arquivo `supabase/migrations/20261026_beta_testers.sql` documenta a estrutura da tabela. Desativar `enabled` remove o selo de tester, mas não desativa automaticamente uma conta Auth.

## Atualização visual

- **DM Sans**: textos, formulários, botões e navegação.
- **DM Mono**: rótulos auxiliares, selos e microinformações.
- **Playfair Display**: títulos editoriais e nomes em destaque na vitrine.
- Cards com bordas leves, cantos suaves, quase nenhuma sombra e maior espaçamento vertical.

## Primeiro teste com o barbeiro

1. Administrador entra com email/senha criados no Supabase.
2. Abre Convites beta, informa o email do barbeiro e gera link.
3. Envia o link ao barbeiro; ele abre e define uma senha de pelo menos 10 caracteres.
4. O barbeiro configura nome, WhatsApp e descrição.
5. Cria três serviços com preços e fotos.
6. Publica em Publicar e compartilhar.
7. Abre link em outro celular sem login e testa navegação e WhatsApp.

## Banco já criado

- public.beta_invites: RLS sem políticas, acesso somente do backend com chave secreta.
- public.beta_testers: RLS com leitura permitida somente ao próprio usuário; escrita reservada ao backend/administrador do banco.
- public.businesses: RLS por proprietário.
- public.catalog_items: RLS por proprietário.
- Storage público vitrine-media para imagens de catálogo.

O backend usa chave de serviço com checagem de propriedade em todas as operações privadas; nunca envia essa chave ao navegador.

## Comandos locais

npm run check — verifica sintaxe do servidor e interface.
npm test — teste de inicialização e rotas estáticas sem Supabase.
npm start — servidor na porta PORT.

## Limites e segurança

- O Render gratuito suspende o app quando inativo e o disco não é persistente; os dados ficam no Supabase.
- Sem envio automático de emails; convites são enviados manualmente.
- Antes de ampliar o beta, implementar recuperação de senha, proteção anti-abuso distribuída, auditoria e testes ponta a ponta.
- Confirmar HTTPS, sessões e uploads em navegadores móveis antes de convidar usuários.
