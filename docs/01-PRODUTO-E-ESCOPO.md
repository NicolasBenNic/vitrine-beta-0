# Visão de produto e escopo

## 1. Problema e oportunidade

Pequenos negócios costumam divulgar produtos e serviços em mensagens, listas de preços, PDFs, redes sociais ou links isolados. O Vitrine propõe um catálogo visual vertical, feito para ser explorado no celular e compartilhado por link ou WhatsApp. A empresa controla sua apresentação; o cliente vê itens, preços, descrição e mídia sem precisar criar conta.

**Posicionamento de referência:** transformar produtos e serviços em uma experiência que as pessoas queiram explorar. Não é apenas um gerador de posts.

## 2. Público-alvo e teste inicial

- **Usuário criador:** dono(a) de pequeno negócio, inicialmente um barbeiro conhecido do fundador; deve conseguir publicar sem ajuda técnica.
- **Visitante:** cliente que recebe o link no WhatsApp, Instagram, QR code ou outra divulgação; não faz login.
- **Administrador/tester:** fundador e pessoas selecionadas durante o beta. O Beta existente tem convites e tabela de testers; no Mini, o modelo de entrada ainda deve ser decidido.

Depois da barbearia, a solução pode atender salões, profissionais autônomos, lojas, restaurantes e prestadores de serviço. Isso é possibilidade futura, não requisito para o primeiro teste.

## 3. Princípios de produto

1. **Mobile-first real:** fluxo completo no navegador do celular, com botões tocáveis e mídia responsiva.
2. **Poucos passos:** empresa → serviços → publicação.
3. **Contexto vira identidade:** a descrição do negócio e a promessa ao cliente influenciam apresentação e texto; não somente um tema genérico.
4. **Controle do dono:** sugerir visual e texto, mas permitir revisar e editar antes de publicar.
5. **Foco em conversão simples:** o cliente entende a oferta e pode contatar a empresa, preferencialmente por WhatsApp.
6. **Custo baixo:** usar serviços gratuitos enquanto couber, sem prometer limites fixos de terceiros.
7. **Sem métricas por enquanto:** o fundador decidiu não incluir resultados/analytics nesta versão.

## 4. Escopo obrigatório do Vitrine Mini

| Área | Entrega |
| --- | --- |
| Cadastro da empresa | Nome, endereço/localização, tipo de serviço, WhatsApp e contexto de marca |
| Contexto | História/descrição do negócio; o que deseja entregar ao cliente; estilo/percepção desejada |
| Personalização | Tema visual sugerido com base no contexto, revisável antes de publicar |
| Catálogo | Criar/editar/excluir/reordenar serviços ou produtos; nome, descrição, valor e mídia |
| Mídia | Fotos e vídeos com upload persistente, visualização e estados de erro |
| Prévia | Ver a experiência pública no celular antes da publicação |
| Publicação | Publicar/despublicar; link por slug; copiar e compartilhar |
| Vitrine pública | Acessível sem login, exibe marca e itens, navegação simples e contato |

**Atenção:** o escopo acima é o **alvo** do Mini, não o inventário de recursos do Beta atual.

## 5. Fora de escopo nesta etapa

- Analytics, eventos, dashboards de resultados, relatórios ou funis.
- Pagamento, assinatura, checkout, POS e controle de estoque.
- Agendamento/reservas e integrações com agenda.
- Feed social, comentários, perfis de clientes e chat em tempo real.
- Motor de IA obrigatório, geração de imagens ou vídeos por IA.
- Multilojas/equipes, papéis avançados, automações de marketing.
- App nativo para iOS/Android: primeiro uma **web app mobile**.

## 6. Jornadas

**Criador:** entrar/autenticar → informar dados e contexto → receber sugestão de tema → ajustar se necessário → cadastrar serviços com mídia → visualizar → publicar → compartilhar → voltar para editar.

**Cliente:** receber link → abrir no navegador → entender negócio → explorar itens → ver preço e mídia → tocar em contato/WhatsApp.

**Tester:** seguir exatamente a jornada do criador; registrar dúvidas, pontos de fricção e falhas em dispositivo real.

## 7. Hipóteses a validar com o barbeiro

- O formulário de contexto é compreensível e não parece longo demais.
- A personalização transmite a identidade da barbearia sem ajustes técnicos.
- O barbeiro consegue subir uma foto/vídeo pelo próprio celular.
- O link publicado abre rapidamente e o preço fica legível.
- O visitante entende como pedir informação pelo WhatsApp.

Como não haverá analytics, o teste pode ser observado e documentado manualmente (anotações, bugs, feedback qualitativo). Isso **não** implica desenvolver um dashboard.

## 8. Direção visual

- **DM Sans:** interface, textos, formulários, botões.
- **DM Mono:** rótulos e metadados.
- **Playfair Display:** títulos editoriais e destaques.
- Fundo off-white, texto quase preto, lime em ações, roxo em elementos de inteligência/assistente.
- Cards com bordas suaves, sombra discreta, pouco ruído e respiro generoso.
- A identidade final de cada vitrine pode variar dentro de temas controlados. Manter contraste, legibilidade e acessibilidade.

## 9. Decisões já tomadas vs. decisões abertas

**Tomadas:** beta inicial fechado para convidados; primeiros testes com barbeiro; prioridade a ferramentas gratuitas; analytics removidos; Vitrine Mini com três telas de criação/publicação e experiência pública; contexto da empresa como entrada para personalização; fotos e vídeos no Mini.

**Abertas:** código-base do AI Studio vs. repositório Beta; necessidade de login no Mini; mecanismo de personalização (regras ou modelo); limites de vídeo; localização/endereço completo vs. cidade; se a publicação exige aprovação; política de exclusão e retenção de mídia; hospedagem definitiva.

O desenvolvedor deve confirmar as abertas com o fundador, sem tratá-las como requisitos já aprovados.
