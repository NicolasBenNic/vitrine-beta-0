# Especificação funcional — Vitrine Mini (ALVO)

**Este documento descreve o produto a construir, não recursos já implementados no repositório Beta.**

## Mapa de telas

- **Tela 1 — Empresa e identidade**
- **Tela 2 — Serviços/produtos e mídia**
- **Tela 3 — Prévia e publicação**
- **Rota pública — Visualização do cliente** (`/v/:slug`, sem login)

Pode existir uma tela mínima de login/entrada como infraestrutura, mas não deve se transformar em dashboard.

## Tela 1 — Cadastro da empresa

### Campos essenciais

| Campo | Tipo / validação proposta | Observação |
| --- | --- | --- |
| Nome da empresa | Texto obrigatório, até 120 caracteres | Ex.: Barbearia Central |
| Tipo de negócio | Seleção ou texto obrigatório | Ex.: Barbearia |
| Endereço | Texto; cidade e UF separados se necessário | Definir se endereço exato será público |
| WhatsApp | Número com DDI + DDD, obrigatório se for o CTA principal | Validar e normalizar para link `wa.me` |
| Logotipo / imagem de capa | Imagem opcional | Não impedir primeiro cadastro |
| Sobre a empresa | Texto livre, até 1.000 caracteres (proposta) | História, especialidade, diferencial |
| O que deseja entregar ao cliente? | Texto livre, até 1.000 caracteres (proposta) | Promessa e experiência |
| Personalidade desejada | Escolha: sofisticada, moderna, acolhedora, criativa | Ajustável depois |

### Personalização

Ao salvar, o app sugere **tema**, **headline** e **texto de apresentação** usando as respostas. Recomendação inicial: 3–4 temas com paleta, tipografia, espaçamento e tratamento de cards predefinidos, selecionados por regras transparentes. IA pode ajudar no texto futuramente, mas não deve bloquear a criação.

- Mostrar uma prévia do tema e permitir trocar manualmente.
- Nunca inventar endereço, especialidades, certificações ou benefícios.
- Guardar o texto original da empresa separado do texto sugerido.
- Se faltar contexto, aplicar tema neutro sem erro.

### Estados

Novo cadastro, edição, salvando, salvo, erro de validação, erro de rede e recuperação de rascunho. Ao voltar, não perder campos já salvos.

### Aceite

- Dado um proprietário autenticado, quando salva dados válidos, eles permanecem após recarregar.
- Ao editar o contexto, o app atualiza a sugestão visual sem sobrescrever ajustes manuais sem confirmação.
- Uma empresa não consegue alterar dados de outra.

## Tela 2 — Criação da vitrine

### Item

- Nome obrigatório.
- Descrição opcional.
- Preço em BRL (centavos no banco, inclusive `0` quando permitido).
- Categoria simples (opcional no primeiro teste).
- Uma ou mais fotos; vídeo opcional; escolher capa.
- Ordem de exibição editável.
- Ações de adicionar, editar, remover, duplicar (duplicar é opcional).
- Confirmar alteração de preço e exclusão.

### Upload de mídia

- Tipos propostos: JPEG, PNG, WebP e MP4/WebM, conforme compatibilidade dos dispositivos e do storage.
- Validar tipo, tamanho e, para vídeo, duração. **Limites definitivos dependem da cota real do plano gratuito e da implementação.**
- Exibir progresso/estado, prévia e opção de tentar novamente.
- Evitar autoplay com som; oferecer capa/poster, `playsinline`, `muted` e controles adequados.
- Salvar arquivos em Storage persistente, não no disco temporário da hospedagem.
- Upload interrompido não deve criar item inconsistente nem deixar a UI em falso sucesso.

### Aceite

- Criar um item com foto e outro com vídeo; recarregar e continuar vendo a mídia.
- Editar nome/descrição/preço, com confirmação de mudança de preço.
- Excluir item, com confirmação, sem afetar os demais.
- Reordenar itens e refletir a ordem na vitrine pública.
- Arquivos de outra conta não podem ser associados ao item.

## Tela 3 — Prévia e publicação

- Prévia fiel ao que será exibido ao cliente; idealmente usar **o mesmo componente** da vitrine pública.
- Mostrar título/descrição da empresa, tema selecionado e itens.
- Botão **Publicar**, **Retirar do ar**, **Copiar link** e **Compartilhar**.
- Slug estável e único; edição de slug não é necessária no Mini.
- Não publicar sem nome do negócio e pelo menos um item válido.
- Mostrar sucesso, falha e status atual; não confundir rascunho com publicação real.
- Alterações após publicar: definir se ficam públicas imediatamente (recomendação inicial: sim, após salvar).

### Aceite

- Publicar e abrir o link em navegador anônimo ou outro celular sem login.
- Despublicar e confirmar que o link não entrega catálogo.
- Não publicar item que esteja marcado como inativo/rascunho.
- Copiar/compartilhar link aponta para o slug correto.

## Rota pública — Cliente

- Identidade visual coerente com o contexto da empresa.
- Nome, descrição e dados de contato aprovados pelo proprietário.
- Cards verticais navegáveis com foto/vídeo, título, descrição e preço.
- Navegação por toque, teclado e controles claros; considerar gesto de swipe somente se não prejudicar acessibilidade.
- CTA de WhatsApp com mensagem predefinida que cita o serviço; sem obrigar o cliente a criar conta.
- Estado vazio/indisponível e tratamento de vídeo lento ou não suportado.
- Não expor dados privados, tokens, endereço não autorizado ou rascunhos.

### Aceite

- Em Android e iPhone, texto não corta, vídeo não estoura largura, botões são tocáveis e não há rolagem horizontal acidental.
- Cliente vê o preço correto e consegue abrir o WhatsApp.
- O mesmo link funciona sem autenticação.

## Regras transversais

- **Mobile-first:** priorizar larguras de 320 a 430 px, testar tablet e desktop também.
- **Acessibilidade:** contraste, foco visível, rótulos em campos, alternativas textuais para imagens, pausa em vídeos, respeito a redução de movimento.
- **Performance:** imagens otimizadas, lazy loading, capa de vídeo, evitar baixar todos os vídeos ao abrir.
- **Resiliência:** estados de carregamento, mensagens claras, salvamento persistente, tentativa novamente.
- **Segurança:** autenticação para edição, autorização por proprietário no servidor/RLS, segredos só no backend.
- **Sem analytics:** não criar tracking de visualização, swipe, favorito ou funil.

## Exemplo de cenário de teste

**Barbearia:** cadastrar “Barbearia Central”, contar que oferece atendimento clássico e cuidadoso, escolher visual sofisticado, cadastrar “Corte masculino” (foto) e “Barba completa” (vídeo), visualizar, publicar, abrir em outro celular e tocar no WhatsApp do segundo serviço.

O cenário é ilustrativo; não pressupõe dados reais da empresa.
