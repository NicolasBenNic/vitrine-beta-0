# Roadmap, qualidade e decisões pendentes

## 1. Ordem de implementação sugerida

### P0 — Definir base e ambiente

- [ ] Receber código/exportação do **Google AI Studio**.
- [ ] Comparar com o Beta e escolher branch/repositório do Mini.
- [ ] Confirmar acesso do dev a GitHub, Supabase e Render.
- [ ] Verificar/reativar Supabase e exportar schema + políticas.
- [ ] Configurar ambiente de desenvolvimento e executar smoke tests.

**Pronto quando:** o dev consegue executar uma versão local, entende onde persistem dados e não depende de segredo compartilhado por chat.

### P1 — Cadastro e identidade

- [ ] Formulário de empresa com dados padrão e contexto.
- [ ] Persistir história, promessa ao cliente, tipo e localização.
- [ ] Sugerir um entre 3–4 temas e permitir revisão manual.
- [ ] Gerar texto de apresentação editável, sem inventar fatos.
- [ ] Validar campos, salvar rascunho e reabrir sem perder dados.

**Pronto quando:** o barbeiro cadastra a empresa pelo celular e encontra os dados após sair/entrar.

### P2 — Catálogo e mídia

- [ ] CRUD de itens com nome, descrição e preço.
- [ ] Múltiplas fotos e vídeo opcional.
- [ ] Upload persistente com progresso/erro e capa.
- [ ] Ordem de exibição e confirmação de exclusão/preço.
- [ ] Verificar propriedade de mídia e item no servidor/RLS.

**Pronto quando:** dois serviços, um com foto e outro com vídeo, sobrevivem a reload e aparecem na ordem escolhida.

### P3 — Prévia, publicação e cliente

- [ ] Prévia usa o mesmo feed da rota pública.
- [ ] Publicar/despublicar e copiar/compartilhar link.
- [ ] Rota `/v/:slug` aberta sem login, somente se publicada.
- [ ] Tema e contexto aparecem corretamente para o cliente.
- [ ] CTA WhatsApp por serviço.
- [ ] Estados vazios, carregamento e erro.

**Pronto quando:** o barbeiro compartilha o link e outro celular abre a vitrine correta, com mídia e contato.

### P4 — Estabilização antes do piloto

- [ ] Testes de acesso cruzado, rascunho e upload indevido.
- [ ] Teste de vídeo gravado em Android e iPhone.
- [ ] Revisão de legibilidade, desempenho, acessibilidade e consumo de dados.
- [ ] Política de limpeza de arquivos órfãos e backup.
- [ ] Instruções simples para o barbeiro e canal de feedback.

**Pronto quando:** fluxo de teste completo sem assistência técnica e falhas críticas corrigidas.

## 2. Matriz mínima de QA

| Caso | Como testar | Esperado |
| --- | --- | --- |
| Cadastro de empresa | Preencher e recarregar | Dados persistem |
| Contexto/tema | Alterar promessa e selecionar tema | Prévia muda de forma previsível; ajustes não se perdem |
| Foto | Enviar JPG/PNG/WebP pelo celular | Mídia permanece após reload |
| Vídeo | Enviar vídeo curto do celular | Reproduz sem áudio automático, com capa e pausa |
| Preço | Editar preço | Confirmação antes de salvar |
| Exclusão | Excluir item | Confirmação; demais itens preservados |
| Publicação | Publicar e abrir aba anônima | Conteúdo acessível sem login |
| Despublicação | Retirar do ar e abrir URL | Catálogo não é entregue |
| Isolamento | Conta B tenta editar item de A | Negado pelo servidor/RLS |
| Link WhatsApp | Abrir CTA de um serviço | Número e mensagem corretos |
| Rede lenta | Simular conexão móvel | Feedback de carregamento, sem travamento |
| Responsividade | 320, 375, 390, 430 px + desktop | Sem cortes/rolagem horizontal acidental |
| Acessibilidade | Teclado, leitor de tela, contraste | Controles utilizáveis |
| Estado do banco | Supabase indisponível | Erro compreensível; sem falso sucesso |

## 3. Critérios de pronto (Definition of Done)

- Código versionado com revisão e sem credenciais.
- Schema/migrações e alterações de Storage documentadas.
- Validações no cliente **e no servidor**.
- Testes de unidade/integração relevantes passando.
- QA mobile em aparelho real, com foto e vídeo.
- Erros e estados vazios tratados.
- Link público realmente testado em outro dispositivo.
- Documentação e instruções de execução atualizadas.
- Nenhum recurso de analytics introduzido sem nova decisão.

## 4. Decisões a tomar com o fundador

| Pergunta | Recomendação inicial | Quem decide |
| --- | --- | --- |
| Base do Mini? | Inspecionar export do AI Studio antes de escolher | Fundador + dev |
| Login no Mini? | Manter autenticação simples para edição | Fundador + dev |
| Entrada por convite? | Reaproveitar se piloto fechado; não exibir como tela principal | Fundador |
| Personalização com IA? | Começar por temas/regras; IA opcional depois | Fundador + dev |
| Endereço público? | Exibir cidade; endereço exato só com consentimento | Fundador |
| Quantos vídeos e qual limite? | Definir após medir cotas e testar aparelhos | Dev + fundador |
| Hospedagem? | Reutilizar Render/Supabase se estiverem operacionais | Dev |
| Mudança após publicar? | Atualização imediata após salvar, com confirmação para mudanças críticas | Fundador |
| Política de mídia? | Definir exclusão, retenção e privacidade | Dev + fundador |

## 5. Riscos priorizados

1. **Supabase inativo**: bloqueia login e persistência até recuperação.
2. **Código do AI Studio não inspecionado**: pode exigir adaptação substancial.
3. **Vídeo e planos gratuitos**: tamanho, formatos, cota e latência podem limitar o piloto.
4. **Chave privilegiada**: vazamento de `service_role` compromete dados; nunca no cliente.
5. **Migrações incompletas do Beta**: o banco atual não é totalmente reproduzível apenas pelo GitHub.
6. **Personalização excessiva**: IA livre pode gerar layouts inconsistentes; temas controlados reduzem risco.
7. **Teste apenas visual**: telas funcionando não garantem upload/publicação real.

## 6. Histórico de decisões (linha do tempo)

- **Protótipo original:** dashboard React com feed, chat visual e analytics simulados; descrito em `GEMINI_HANDOFF.md`.
- **Beta full-stack:** foco em persistência, upload, link público e gestão real.
- **Piloto fechado:** convidados, tester fundador e primeiro barbeiro como usuário real.
- **Infra de baixo custo:** GitHub privado, Render Free e Supabase.
- **Escopo reduzido:** o fundador descartou analytics/resultados.
- **Identidade visual:** DM Sans, DM Mono, Playfair Display; cards suaves, muito espaço.
- **Vitrine Mini (decisão mais recente):** três telas essenciais, contexto do negócio para personalização, fotos **e vídeos**, prévia/publicação e experiência pública.
- **Google AI Studio:** projeto novo em construção, **sem código disponibilizado nesta análise**.

## 7. Fontes consultadas

- [Código Beta no GitHub](https://github.com/NicolasBenNic/vitrine-beta-0), branch `main`, arquivos `server.mjs`, `public/app.js`, `public/style.css`, `README.md`, `render.yaml`, `package.json`, `tests/offline.test.mjs`.
- [Migração de testers](https://github.com/NicolasBenNic/vitrine-beta-0/blob/main/supabase/migrations/20261026_beta_testers.sql).
- Google Drive, pasta `vitrine`: `GEMINI_PROMPT`, `GEMINI_HANDOFF.md` e ZIP do protótipo.
- Decisões do fundador nesta conversa, especialmente escopo do Mini e exclusão de analytics.
- Status dos serviços consultado em 18/11/2026; Supabase `INACTIVE`, Render último deploy `live` de 26/10/2026.

**Manter este histórico atualizado.** Separar fatos de implementação de sugestões arquiteturais.
