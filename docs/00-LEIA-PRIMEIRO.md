# Vitrine — handoff para desenvolvimento

**Data de referência:** 18/11/2026  
**Status:** documentação de produto + inventário técnico do repositório existente; não é prova de que o novo Vitrine Mini já esteja implementado.  
**Idioma do produto:** português brasileiro. **Abordagem:** mobile-first.

## Resumo em 60 segundos

O Vitrine é uma ferramenta para pequenos negócios criarem uma vitrine digital visual e compartilhável. O proprietário cadastra o negócio, adiciona serviços/produtos com mídia, preço e descrição, publica um link e o cliente navega pelo catálogo no celular. A hipótese de produto é que uma apresentação mais envolvente e contextualizada seja mais útil do que um PDF ou uma lista de links.

**Escopo escolhido para a próxima versão (Vitrine Mini):**
1. **Cadastro da empresa**, incluindo dados básicos e contexto da marca (história, proposta de valor, experiência desejada para o cliente).
2. **Criação da vitrine**, com fotos **e vídeos**, descrição e preço de cada item.
3. **Publicação e prévia**, com link público e experiência de visualização para o cliente.

A apresentação deve ser personalizada a partir do contexto informado pela empresa. Começar com temas controlados e editáveis; IA generativa é uma possibilidade futura, não uma dependência obrigatória.

**Fora do Mini:** analytics/resultados, dashboards de desempenho, pagamentos, planos, POS, reservas, chat com IA e automações complexas.

## Duas frentes diferentes: NÃO confundir

| Frente | O que é | Fonte da verdade |
| --- | --- | --- |
| **Vitrine Beta existente** | Aplicação web já codificada e publicada anteriormente; login, convite, CRUD de serviços, upload de imagens, vitrine pública e WhatsApp. | Repositório privado [NicolasBenNic/vitrine-beta-0](https://github.com/NicolasBenNic/vitrine-beta-0) |
| **Vitrine Mini / Google AI Studio** | Nova simplificação definida pelo fundador; três telas, contexto de marca e mídia com vídeo. | Esta especificação + **código/exportação do Google AI Studio ainda não fornecido para inspeção** |

**Não assumir que o código do GitHub é o código atual do Google AI Studio.** Não foi possível auditar o app do AI Studio nesta entrega. Antes de desenvolver, solicitar ao fundador a exportação do projeto e confirmar se a evolução ocorrerá em novo repositório/branch ou sobre o Beta.

## Links e serviços identificados

- **Repositório Beta:** https://github.com/NicolasBenNic/vitrine-beta-0 (privado; conceder acesso ao dev).
- **Render Beta:** https://vitrine-beta-0.onrender.com (serviço `vitrine-beta-0`, plano Free, deploy automático da branch `main`).
- **Supabase Beta:** projeto `vitrine-beta`, referência `uxoxxkufmqtkgyvpynyy`, região `us-east-1`.
- **Documentos históricos:** pasta `vitrine` no Google Drive; contém `GEMINI_PROMPT`, `GEMINI_HANDOFF.md` e o ZIP do protótipo original.
- **Google AI Studio:** projeto mencionado pelo fundador; URL, código e configuração não foram disponibilizados aqui.

**Alerta operacional em 18/11/2026:** a consulta ao Supabase retornou `status: INACTIVE`. Isso precisa ser resolvido/confirmado antes de testar login, banco ou upload. O Render informa último deploy conhecido como `live` em 26/10/2026, mas isso **não confirma** que os fluxos dependentes do Supabase estejam operacionais hoje.

## Como ler este pacote

1. [01-PRODUTO-E-ESCOPO.md](01-PRODUTO-E-ESCOPO.md): visão, usuários, decisões, não objetivos.
2. [02-ESPECIFICACAO-FUNCIONAL-MINI.md](02-ESPECIFICACAO-FUNCIONAL-MINI.md): campos, telas, fluxos, critérios de aceite.
3. [03-ARQUITETURA-BETA-ATUAL.md](03-ARQUITETURA-BETA-ATUAL.md): o que existe **de fato** no repositório.
4. [04-DADOS-API-E-SEGURANCA.md](04-DADOS-API-E-SEGURANCA.md): API existente, modelo e cuidados de acesso.
5. [05-ARQUITETURA-PROPOSTA-MINI.md](05-ARQUITETURA-PROPOSTA-MINI.md): desenho **proposto** para personalização e vídeo.
6. [06-AMBIENTES-SETUP-E-OPERACAO.md](06-AMBIENTES-SETUP-E-OPERACAO.md): execução, Render, Supabase e CI.
7. [07-ROADMAP-TESTES-E-DECISOES.md](07-ROADMAP-TESTES-E-DECISOES.md): backlog, testes e pendências.

## O que o desenvolvedor deve fazer primeiro

- Receber acesso de colaborador ao repositório privado e uma exportação do app do Google AI Studio.
- Confirmar com o fundador **qual código será a base** do Mini. Não sobrescrever o Beta sem decisão explícita.
- Reativar/verificar o Supabase e confirmar o schema real, Storage, Auth e RLS.
- Executar o projeto localmente, verificar a experiência mobile e registrar divergências.
- Implementar **uma jornada ponta a ponta** antes de adicionar extras: cadastro → 1 serviço com mídia → prévia → publicar → abrir link em outro celular.
- Documentar decisões de tecnologia e esquema antes de criar migrações.

## Convenções e limites

- Reais em centavos inteiros no banco; formatar como BRL na interface.
- Não colocar credenciais em commits, prints, prompts do AI Studio ou navegador.
- Rota pública não deve expor rascunhos nem dados privados.
- O proprietário só pode editar seu próprio negócio.
- Confirmar alteração de preço e exclusão.
- Separar **implementado**, **proposto** e **não verificado** em todas as entregas.

## Critério de sucesso do Mini

Um barbeiro convidado consegue, pelo celular, descrever sua barbearia, criar pelo menos três serviços com fotos ou vídeos, conferir um layout coerente com a identidade do negócio, publicar e compartilhar um link que abre em outro celular sem login.

> Este documento é uma transferência de contexto. Não substitui inspeção do código do Google AI Studio nem testes reais de ponta a ponta.
