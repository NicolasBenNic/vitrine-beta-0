const root = document.getElementById('app');
const toastBox = document.getElementById('toast');
let inviteToken = new URLSearchParams(location.search).get('invite') || '';
const publicSlug = location.pathname.startsWith('/v/') ? location.pathname.slice(3) : '';
const state = { user:null, business:null, items:[], tab:'home', modal:null, editImagePath:'', previewIndex:0, editDraft:null, editImageURL:'', public:null, publicIndex:0, publicFilter:'Todos', invites:[], inviteLink:'', inviteLinkEmail:'', invitesLoading:false, invitesLoaded:false, invitesError:'', invitesHasMore:false, inviteFilter:'todos', inviteQuery:'', adminSummary:null, adminSummaryLoading:false, adminSummaryError:'', adminBusinesses:null, adminBusinessesLoading:false, adminBusinessesError:'', adminBusinessQuery:'', adminBusinessStatus:'todos', businessDetailId:null, testers:null, testersLoaded:false, testersLoading:false, testersError:'', testerQuery:'', testerStatus:'todos', testerDetailId:null, systemReport:null, systemLoading:false, systemError:'', busy:false };
let toastTimer;
function esc(value) { return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(cents) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(cents || 0) / 100); }
function asCents(value) {
  const v = String(value || '0').trim().replace(/[^\d,.-]/g,'');
  const number = Number(v.includes(',') ? v.replace(/\./g,'').replace(',','.') : v);
  if (!Number.isFinite(number) || number < 0 || number > 1000000) throw Error('Preço inválido.');
  return Math.round(number * 100);
}
function toast(message, error=false) {
  toastBox.textContent = message;
  toastBox.style.background = error ? '#963d45' : '#282329';
  toastBox.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastBox.classList.remove('show'), 3900);
}
async function request(path, options={}) {
  const response = await fetch(path,{ credentials:'same-origin', ...options });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw Error(data.error || 'Falha na comunicação com o servidor.');
  return data;
}
function jsonBody(value) { return { headers:{'Content-Type':'application/json'}, body:JSON.stringify(value) }; }
function link() { return location.origin + '/v/' + state.business.slug; }
async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast('Link copiado.'); }
  catch { window.prompt('Copie o link:', value); }
}
function logo() { return '<a class="brand" href="/"><span class="brand-icon">V.</span><span class="brand-word">vitrine<span style="color:#7967c2">.</span></span></a>'; }
function renderAuth() {
  const registering = Boolean(inviteToken);
  root.innerHTML = '<div class="auth-page"><div class="auth-art"><div>' +
    '<span class="pill purple">acesso exclusivo · beta</span><h1 style="margin-top:45px">Sua vitrine.<br><em>Seu negócio.</em><br>Seu jeito.</h1>' +
    '<p class="lead" style="color:#3d3a3f">Produtos, serviços e preços em um link simples para compartilhar com seus clientes.</p></div>' +
    '<p class="small">Vitrine Beta · acesso somente por convite</p></div>' +
    '<div class="auth-box"><form class="auth-form" id="auth-form">' + logo() +
    '<span class="pill green">' + (registering?'Seu convite chegou':'Área de acesso') + '</span>' +
    '<h2>' + (registering?'Ativar minha vitrine':'Entrar na Vitrine') + '</h2>' +
    '<p class="auth-hint">' + (registering?'Crie sua conta para começar.':'Apenas pessoas convidadas podem criar uma conta.') + '</p>' +
    '<label class="field">Email<input name="email" type="email" autocomplete="email" required placeholder="voce@exemplo.com"></label>' +
    (registering?'<label class="field">Nome do negócio<input name="businessName" maxlength="120" required placeholder="Ex.: Barbearia Central"></label>':'') +
    '<label class="field">Senha<input name="password" type="password" autocomplete="' + (registering?'new-password':'current-password') + '" minlength="' + (registering?'10':'1') + '" required placeholder="Sua senha"></label>' +
    '<button class="button lime" type="submit">' + (registering?'Criar conta com convite':'Entrar na minha conta') + ' →</button>' +
    (registering?'<p class="auth-hint" style="margin-top:20px"><a href="/">Já tenho conta. Entrar</a></p>':'<p class="auth-hint" style="margin-top:20px">Ainda não recebeu convite? Peça um link para o administrador do Vitrine Beta.</p>') +
    '</form></div></div>';
}
function previewItem(item, idx, total) {
  if (!item) return '<div class="phone"><div class="phone-top"><span class="phone-brand">' + esc(state.business.name) + '</span><span>✦</span></div><div class="preview-empty"><strong>Sua vitrine<br>começa aqui.</strong><p>Adicione seu primeiro serviço.</p></div></div>';
  return '<div class="phone"><div class="phone-top"><span class="phone-brand">' + esc(state.business.name) + '</span><span>✦</span></div>' +
    '<div class="phone-card">' + (item.image_url?'<img class="phone-image" src="' + esc(item.image_url) + '" alt="">':'') +
    '<div class="phone-shade"></div><div class="phone-info"><span class="pill green">' + esc(item.category) + '</span>' +
    '<h3>' + esc(item.name) + '</h3><p>' + esc(item.description || 'Conheça este serviço.') + '</p><strong>' + money(item.price_cents) + '</strong></div></div>' +
    '<div class="phone-footer"><button type="button" class="phone-nav" data-action="preview-prev" aria-label="Anterior">❮</button>' +
    '<div class="phone-pager">' + Array.from({length:Math.min(total,7)},(_,i)=>'<span class="dot '+(i===idx?'active':'')+'"></span>').join('') + '</div>' +
    '<button class="phone-button" type="button" data-action="preview-next">Próximo →</button></div></div>';
}
function itemRows() {
  if (!state.items.length) return '<div class="empty"><strong>Nenhum serviço cadastrado.</strong><p>Adicione fotos, nomes e preços para montar seu catálogo.</p><button class="button lime" data-action="add-item">+ Meu primeiro serviço</button></div>';
  return state.items.map(item => '<div class="item-row">' +
    (item.image_url?'<img class="thumb" src="' + esc(item.image_url) + '" alt="">':'<div class="thumb fallback">✦</div>') +
    '<div class="item-copy"><strong>' + esc(item.name) + '</strong><small>' + esc(item.category) + ' · ' + money(item.price_cents) + '</small></div>' +
    '<button class="ghost-icon" type="button" data-action="edit-item" data-id="' + esc(item.id) + '" aria-label="Editar '+esc(item.name)+'">•••</button></div>').join('');
}
function businessForm() {
  const b=state.business;
  return '<section class="card"><div class="card-head"><div class="heading-group"><span class="symbol lime">✦</span><div><h2>Configure seu negócio</h2><p>Informações exibidas para seus clientes</p></div></div><span class="pill">01 / 03</span></div>' +
    '<form id="business-form"><div class="form-grid"><label class="field full">Nome do negócio<input name="name" required maxlength="120" value="' + esc(b.name) + '"></label>' +
    '<label class="field full">Descrição curta<textarea name="description" rows="2" maxlength="500" placeholder="Quem somos e o que fazemos">' + esc(b.description) + '</textarea></label>' +
    '<label class="field full">WhatsApp com DDD e país<input name="whatsapp" inputmode="tel" maxlength="22" value="' + esc(b.whatsapp) + '" placeholder="5585999999999"></label></div>' +
    '<div class="actions"><button class="button secondary" type="submit">Salvar negócio</button></div></form>' +
    '<div class="divider"></div><label class="field">Foto ou logotipo (JPG, PNG, WebP, até 10 MB)<input type="file" data-upload="logo" accept="image/jpeg,image/png,image/webp"></label>' +
    (b.logo_url?'<img style="width:72px;height:72px;border-radius:13px;object-fit:cover;margin-top:10px" src="'+esc(b.logo_url)+'" alt="Logotipo">':'') +
    '</section>';
}
function quickChat() {
  return '<section class="card"><div class="card-head"><div class="heading-group"><span class="symbol">✳</span><div><h2>Fale com a Vitrine</h2><p>Comandos simples para agilizar seu trabalho</p></div></div><span class="pill green">online</span></div>' +
    '<div class="thread"><div class="bubble"><span class="bubble-icon">✦</span><div>Olá! Vamos montar sua vitrine? Digite <strong>Adicione corte masculino por R$ 60</strong> ou <strong>Publique</strong>.</div></div></div>' +
    '<form id="command-form"><div class="mini-input"><input name="command" maxlength="220" placeholder="Adicione barba por R$ 40" required><button class="button primary" type="submit" aria-label="Executar comando">↗</button></div></form>' +
    '<div class="quick-chips"><button class="chip" data-action="quick-add">+ Adicionar serviço</button><button class="chip" data-action="quick-publish">Publicar vitrine ↗</button></div></section>';
}
function homepage() {
  return '<div class="heading"><div><p class="kicker">seu espaço de criação</p><h1>Crie um feed que<br><em>vende por você.</em></h1><p class="lead">Cadastre serviços, confira a experiência no celular e publique um link para compartilhar com seus clientes.</p></div>' +
    '<span class="pill ' + (state.business.is_published?'green':'') + '">' + (state.business.is_published?'● Publicada':'○ Em preparação') + '</span></div>' +
    '<div class="workspace"><div class="stack">' + quickChat() + businessForm() +
    '<div><div class="catalog-head"><div><p class="kicker">seus serviços</p><h2>Itens da vitrine <span class="muted">' + state.items.length + '</span></h2></div>' +
    '<button class="button lime" data-action="add-item">+ Adicionar item</button></div><div class="items-list">' + itemRows() + '</div></div></div>' +
    '<aside class="preview-panel"><div class="preview-heading"><p class="kicker">ao vivo</p><h2>Veja como<br>seu cliente vê.</h2></div>' +
    previewItem(state.items[state.previewIndex % (state.items.length || 1)],state.previewIndex,state.items.length) +
    '<div class="footer-note">Prévia interativa · sem analytics</div>' +
    '<div class="actions" style="justify-content:center"><button class="button secondary" data-action="tab" data-tab="publish">Publicar e compartilhar →</button></div></aside></div>';
}
function catalogPage() {
  return '<div class="section-panel"><div class="heading"><div><p class="kicker">catálogo de serviços</p><h1>O que você<br><em>oferece.</em></h1><p class="lead">Adicione fotos, descrições e preços. Suas alterações ficam salvas no Supabase.</p></div></div>' +
    '<div class="catalog-head"><h2>' + state.items.length + ' serviço(s) cadastrado(s)</h2><button class="button lime" data-action="add-item">+ Novo serviço</button></div>' +
    '<div class="items-list">' + itemRows() + '</div></div>';
}
function publishPage() {
  const b=state.business, published=b.is_published;
  return '<div class="section-panel"><div class="heading"><div><p class="kicker">publicação</p><h1>Pronta para<br><em>ser vista.</em></h1><p class="lead">Só você pode editar. Seus clientes acessam a vitrine pelo link, sem cadastro.</p></div></div>' +
    '<div class="cover"><span class="pill ' + (published?'green':'purple') + '">' + (published?'● Online':'○ Rascunho') + '</span>' +
    '<h2 style="margin:17px 0 8px">' + (published?'Sua vitrine está publicada.':'Sua vitrine ainda está privada.') + '</h2>' +
    '<p class="small">' + (published?'Compartilhe com seus clientes pelo WhatsApp ou Instagram.':'Cadastre ao menos um serviço para publicar.') + '</p>' +
    '<div class="actions"><button class="button ' + (published?'secondary':'primary') + '" data-action="toggle-publish">' + (published?'Retirar do ar':'Publicar agora →') + '</button></div></div>' +
    '<section class="card"><h2>Endereço exclusivo</h2><p class="muted small">Este link só fica acessível ao público quando sua vitrine está publicada.</p>' +
    '<p class="publish-url">' + esc(link()) + '</p><div class="actions"><button class="button secondary" data-action="copy-link">Copiar link</button>' +
    (published?'<a class="button lime" target="_blank" rel="noopener noreferrer" href="' + esc(link()) + '">Abrir vitrine ↗</a>':'') +
    '</div></section></div>';
}
function adminSummaryPage() {
  if (!state.user?.isAdmin) return '<div class="empty">Acesso restrito ao administrador.</div>';
  const s=state.adminSummary;
  const cards=[
    {label:'Negócios cadastrados', key:'businesses', detail:'Total de empresas criadas', number:'01', kind:'hero'},
    {label:'Vitrines publicadas', key:'published', detail:'Disponíveis para os clientes', number:'02'},
    {label:'Vitrines em rascunho', key:'drafts', detail:'Ainda não publicadas', number:'03'},
    {label:'Convites pendentes', key:'pendingInvites', detail:'Válidos e ainda não usados', number:'04'},
    {label:'Testers ativos', key:'activeTesters', detail:'Participantes dos testes internos', number:'05'}
  ];
  const date=s?.asOf ? new Date(s.asOf).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—';
  const metrics=state.adminSummaryLoading && !s
    ? '<div class="ops-empty">Carregando totais da operação…</div>'
    : !s
      ? '<div class="ops-error"><strong>Resumo indisponível</strong><p>'+esc(state.adminSummaryError || 'Não foi possível carregar os dados.')+'</p><button class="button secondary" data-action="refresh-summary">Tentar novamente</button></div>'
      : '<div class="ops-metric-grid">'+cards.map(c=>
          '<article class="ops-metric '+(c.kind==='hero'?'ops-metric-featured':'')+'">'+
            '<div class="ops-metric-top"><span class="ops-metric-label">'+esc(c.label)+'</span><span class="ops-metric-index">'+c.number+'</span></div>'+
            '<strong class="ops-metric-value">'+Number(s.counts[c.key] || 0).toLocaleString('pt-BR')+'</strong>'+
            '<div class="ops-metric-bottom"><span>'+esc(c.detail)+'</span><span class="ops-metric-dot" aria-hidden="true"></span></div>'+
          '</article>').join('')+'</div>';
  return '<section class="ops-page">'+
    '<div class="ops-topline"><span class="ops-overline"><span class="ops-online-dot"></span> VITRINE / ADMINISTRAÇÃO</span><span class="pill purple">Área do fundador</span></div>'+
    '<div class="ops-heading"><div><p class="kicker">Resumo operacional</p><h1>Sua operação,<br><em>sob controle.</em></h1>'+
    '<p class="lead">Uma visão simples dos negócios, publicações e acessos ao beta. Sem gráficos ou métricas de visitantes.</p></div>'+
    '<button class="button secondary ops-refresh" data-action="refresh-summary" '+(state.adminSummaryLoading?'disabled':'')+'><span aria-hidden="true">↻</span> Atualizar dados</button></div>'+
    '<div class="ops-section-head"><h2>Panorama do beta</h2><span class="ops-asof">'+(s?'ATUALIZADO EM '+esc(date):state.adminSummaryLoading?'CARREGANDO':'SEM DADOS')+'</span></div>'+
    metrics+
    '<div class="ops-footnote"><span class="ops-footnote-symbol">i</span><div><strong>Controle operacional, não analytics.</strong><p>Estes números representam registros do sistema. Não medimos visualizações, cliques ou comportamento dos visitantes.</p></div></div>'+
    '</section>';
}
function businessDate(value) {
  if (!value) return '—';
  const d=new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
}
function businessLink(business) {
  return location.origin + '/v/' + business.slug;
}
function filteredBusinesses() {
  const rows=state.adminBusinesses?.businesses || [];
  const query=String(state.adminBusinessQuery || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return rows.filter(b=>{
    if(state.adminBusinessStatus==='published' && !b.isPublished) return false;
    if(state.adminBusinessStatus==='draft' && b.isPublished) return false;
    if(!query) return true;
    const haystack=[b.name,b.slug,b.ownerEmail].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return haystack.includes(query);
  });
}
function adminBusinessRows() {
  if (!state.adminBusinesses) return '';
  const list=filteredBusinesses();
  if(!list.length) return '<div class="ops-business-empty"><div class="ops-empty-figure">⌕</div><strong>Nenhum negócio encontrado</strong><p>Revise a busca ou o filtro selecionado.</p></div>';
  return list.map(b=>
    '<div class="ops-business-row">'+
      '<div class="ops-business-name"><div class="ops-business-avatar" aria-hidden="true">'+esc(String(b.name||'?').charAt(0).toUpperCase())+'</div>'+
      '<div class="ops-business-name-text"><strong>'+esc(b.name)+'</strong><span>'+esc(b.slug)+'</span></div></div>'+
      '<div class="ops-business-owner"><span>'+esc(b.ownerEmail || 'E-mail indisponível')+'</span>'+(b.isTester?'<small>Tester interno</small>':'')+'</div>'+
      '<div><span class="ops-business-status '+(b.isPublished?'published':'draft')+'"><i></i>'+(b.isPublished?'Publicada':'Rascunho')+'</span></div>'+
      '<div class="ops-business-date">'+businessDate(b.createdAt)+'</div>'+
      '<div class="ops-business-date">'+businessDate(b.updatedAt)+'</div>'+
      '<div class="ops-business-actions"><button class="ops-business-view" type="button" data-action="business-details" data-id="'+esc(b.id)+'" aria-label="Ver negócio '+esc(b.name)+'">Ver detalhes <span aria-hidden="true">↗</span></button></div>'+
    '</div>'
  ).join('');
}
function renderBusinessRows() {
  const container=document.getElementById('ops-business-list');
  const count=document.getElementById('ops-business-results');
  if(container) container.innerHTML=adminBusinessRows();
  if(count) count.textContent=filteredBusinesses().length+' negócio(s) exibidos';
}
function businessDetailsPanel() {
  if(!state.businessDetailId) return '';
  const b=(state.adminBusinesses?.businesses||[]).find(x=>x.id===state.businessDetailId);
  if(!b) return '';
  return '<div class="modal-backdrop ops-detail-overlay"><div class="modal ops-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ops-detail-title">'+
    '<div class="ops-detail-head"><div><p class="kicker">Negócio cadastrado</p><h2 id="ops-detail-title">'+esc(b.name)+'</h2></div><button class="close" type="button" data-action="close-business-detail" aria-label="Fechar">×</button></div>'+
    '<div class="ops-detail-status"><span class="ops-business-status '+(b.isPublished?'published':'draft')+'"><i></i>'+(b.isPublished?'Publicada':'Rascunho')+'</span>'+
      (b.isTester?'<span class="pill purple">Tester</span>':'')+'</div>'+
    '<dl class="ops-detail-grid">'+
      '<div><dt>Responsável</dt><dd>'+esc(b.ownerEmail || 'E-mail indisponível')+'</dd></div>'+
      '<div><dt>Criada em</dt><dd>'+businessDate(b.createdAt)+'</dd></div>'+
      '<div><dt>Última alteração</dt><dd>'+businessDate(b.updatedAt)+'</dd></div>'+
      '<div><dt>Endereço da vitrine</dt><dd class="ops-detail-slug">'+esc('/v/'+b.slug)+'</dd></div>'+
      '<div class="ops-detail-full"><dt>Descrição</dt><dd>'+esc(b.description || 'Não informada')+'</dd></div>'+
      '<div><dt>WhatsApp</dt><dd>'+esc(b.whatsapp || 'Não informado')+'</dd></div>'+
    '</dl>'+
    '<div class="ops-detail-foot">'+
      (b.isPublished?
        '<a class="button lime" href="'+esc(businessLink(b))+'" target="_blank" rel="noopener noreferrer">Abrir vitrine ↗</a>'+
        '<button class="button secondary" type="button" data-action="copy-business-link" data-id="'+esc(b.id)+'">Copiar link</button>'+
        '<button class="button danger" type="button" data-action="admin-unpublish" data-id="'+esc(b.id)+'">Retirar do ar</button>'
       : '<p class="ops-detail-draft-note">Esta vitrine ainda não está pública. A publicação continua sob controle do proprietário.</p>')+
    '</div>'+
    '<p class="ops-detail-disclaimer">O administrador acompanha e pode retirar uma vitrine publicada do ar. Edição de conteúdo permanece com o proprietário.</p>'+
  '</div></div>';
}
function adminBusinessesPage() {
  if(!state.user?.isAdmin) return '<div class="empty">Acesso restrito ao administrador.</div>';
  const data=state.adminBusinesses;
  const loading=state.adminBusinessesLoading;
  const erro=state.adminBusinessesError;
  const details=data?'<div class="ops-business-section">'+
    '<div class="ops-business-toolbar"><div class="ops-business-search-wrap"><span aria-hidden="true">⌕</span>'+
      '<input type="search" id="ops-business-search" aria-label="Buscar negócios" placeholder="Buscar empresa, email ou slug" autocomplete="off" value="'+esc(state.adminBusinessQuery)+'"></div>'+
      '<label class="ops-filter-label">Status<select id="ops-business-filter"><option value="todos"'+(state.adminBusinessStatus==='todos'?' selected':'')+'>Todos os negócios</option>'+
      '<option value="published"'+(state.adminBusinessStatus==='published'?' selected':'')+'>Publicadas</option>'+
      '<option value="draft"'+(state.adminBusinessStatus==='draft'?' selected':'')+'>Em rascunho</option></select></label></div>'+
    '<div class="ops-business-table"><div class="ops-business-table-head"><span>NEGÓCIO</span><span>RESPONSÁVEL</span><span>STATUS</span><span>CADASTRO</span><span>ATUALIZAÇÃO</span><span></span></div>'+
    '<div id="ops-business-list">'+adminBusinessRows()+'</div></div>'+
    '<div class="ops-business-bottom"><span id="ops-business-results">'+filteredBusinesses().length+' negócio(s) exibidos</span>'+
       (data.hasMore?'<span>Mostrando os 100 registros mais recentes</span>':'<span>Atualização manual · dados do sistema</span>')+'</div></div>' : '';
  return '<section class="ops-page ops-business-page">'+
    '<div class="ops-topline"><span class="ops-overline"><span class="ops-online-dot"></span> VITRINE / ADMINISTRAÇÃO</span><span class="pill purple">Área do fundador</span></div>'+
    '<div class="ops-heading"><div><p class="kicker">Gestão de negócios</p><h1>Quem está<br><em>na Vitrine.</em></h1>'+
    '<p class="lead">Acompanhe empresas, responsáveis e publicações. Controle simples para o beta crescer com organização.</p></div>'+
    '<button class="button secondary ops-refresh" data-action="refresh-businesses" '+(loading?'disabled':'')+'>↻ Atualizar lista</button></div>'+
    '<div class="ops-business-title"><div><h2>Negócios cadastrados</h2><p>Visualize detalhes e acompanhe o status de cada vitrine.</p></div>'+
      '<span class="ops-business-total">'+(data?data.businesses.length.toLocaleString('pt-BR'):'—')+' REGISTROS</span></div>'+
    (loading&&!data?'<div class="ops-empty">Carregando negócios cadastrados…</div>':
      !data?'<div class="ops-error"><strong>Lista indisponível</strong><p>'+esc(erro || 'Não foi possível consultar os negócios.')+'</p><button class="button secondary" data-action="refresh-businesses">Tentar novamente</button></div>':
      details)+
    '<p class="ops-business-note">Os dados são exclusivos do administrador. Não há relatórios de comportamento, tráfego ou analytics.</p>'+
    '</section>'+businessDetailsPanel();
}
function inviteStatus(invite) {
  if(invite.used_at) return 'used';
  if(new Date(invite.expires_at).getTime()===Date.UTC(2000,0,1)) return 'cancelled';
  if(new Date(invite.expires_at).getTime()<=Date.now()) return 'expired';
  return 'pending';
}
function inviteDate(value) {
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
}
function filteredInvites(){
  const term=state.inviteQuery.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return (state.invites||[]).filter(i=>(state.inviteFilter==='todos'||inviteStatus(i)===state.inviteFilter) &&
    (!term || String(i.email).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term)));
}
function inviteRow(i) {
  const status=inviteStatus(i);
  const labels={pending:'Pendente',used:'Utilizado',expired:'Expirado',cancelled:'Cancelado'};
  return '<div class="ops-invite-row">'+
    '<div class="ops-invite-person"><div class="ops-invite-avatar" aria-hidden="true">'+esc(String(i.email).charAt(0).toUpperCase())+'</div>'+
    '<div class="ops-invite-email"><strong>'+esc(i.email)+'</strong><span>Enviado manualmente · '+inviteDate(i.created_at)+'</span></div></div>'+
    '<div class="ops-invite-expiry">'+(status==='used'?'Usado em '+inviteDate(i.used_at):status==='cancelled'?'Acesso invalidado':'Até '+inviteDate(i.expires_at))+'</div>'+
    '<div><span class="ops-invite-status '+status+'"><i></i>'+labels[status]+'</span></div>'+
    '<div class="ops-invite-actions">'+
      (status==='pending'?'<button class="ops-invite-text-btn danger" data-action="cancel-invite" data-id="'+esc(i.id)+'" type="button">Cancelar</button>':
      '<button class="ops-invite-text-btn" data-action="repeat-invite" data-email="'+esc(i.email)+'" type="button">Novo convite ↗</button>')+
    '</div></div>';
}
function updateInviteRows(){
  const list=document.getElementById('ops-invite-list');
  const count=document.getElementById('ops-invite-filtered-count');
  if(list)list.innerHTML=filteredInvites().length?filteredInvites().map(inviteRow).join(''):'<div class="ops-invite-empty"><strong>Nenhum convite encontrado</strong><p>Tente outra busca ou escolha um filtro diferente.</p></div>';
  if(count)count.textContent=filteredInvites().length+' registro(s) exibido(s)';
}
function invitesPage() {
  if(!state.user?.isAdmin)return '<div class="empty">Acesso restrito ao administrador.</div>';
  const ready=state.invitesLoaded;
  const counts={pending:0,used:0,expired:0,cancelled:0};
  for(const invitation of state.invites)counts[inviteStatus(invitation)]++;
  const summary=[
    {key:'pending',label:'Pendentes',description:'Aguardando cadastro',index:'01'},
    {key:'used',label:'Utilizados',description:'Contas já ativadas',index:'02'},
    {key:'expired',label:'Expirados',description:'Prazo encerrado',index:'03'}
  ];
  const statuses=[['todos','Todos'],['pending','Pendentes'],['used','Utilizados'],['expired','Expirados'],['cancelled','Cancelados']];
  const feedback=state.inviteLink?
    '<div class="ops-invite-created"><div class="ops-invite-created-icon">✓</div><div><strong>Convite pronto para enviar</strong><p>Link criado para '+esc(state.inviteLinkEmail)+'. Copie agora e encaminhe por WhatsApp. O link não poderá ser recuperado depois.</p>'+
    '<div class="ops-invite-generated-link">'+esc(state.inviteLink)+'</div>'+
    '<button class="button lime" data-action="copy-invite" type="button">Copiar link de convite <span aria-hidden="true">↗</span></button></div></div>' : '';
  const summaryCards=summary.map(s=>'<article class="ops-invite-stat '+(s.key==='pending'?'featured':'')+'"><div class="ops-invite-stat-top"><span>'+s.label+'</span><small>'+s.index+'</small></div>'+
    '<strong>'+((ready&& !state.invitesLoading)?counts[s.key]:ready?counts[s.key]:'—')+'</strong><p>'+s.description+'</p></article>').join('');
  const list=state.invitesLoading&&!ready?'<div class="ops-empty">Carregando convites…</div>':
    !ready?'<div class="ops-error"><strong>Convites indisponíveis</strong><p>'+esc(state.invitesError || 'Não foi possível consultar os convites.')+'</p><button class="button secondary" type="button" data-action="refresh-invites">Tentar novamente</button></div>':
    '<div class="ops-invite-table"><div class="ops-invite-table-head"><span>CONVIDADO</span><span>VALIDADE</span><span>STATUS</span><span></span></div>'+
    '<div id="ops-invite-list">'+(filteredInvites().length?filteredInvites().map(inviteRow).join(''):'<div class="ops-invite-empty"><strong>Nenhum convite encontrado</strong><p>Revise sua pesquisa ou o filtro escolhido.</p></div>')+'</div></div>'+
    '<div class="ops-invite-list-foot"><span id="ops-invite-filtered-count">'+filteredInvites().length+' registro(s) exibido(s)</span>'+
    '<span>'+(state.invitesHasMore?'Exibindo os 100 convites mais recentes':'Dados atualizados manualmente')+'</span></div>';
  return '<section class="ops-page ops-invite-page">'+
    '<div class="ops-topline"><span class="ops-overline"><span class="ops-online-dot"></span> VITRINE / ADMINISTRAÇÃO</span><span class="pill purple">Área do fundador</span></div>'+
    '<div class="ops-heading"><div><p class="kicker">Gestão de convites</p><h1>Quem entra,<br><em>você decide.</em></h1>'+
    '<p class="lead">Convide novos negócios para o beta, acompanhe os acessos e mantenha o cadastro fechado.</p></div>'+
    '<button class="button secondary ops-refresh" type="button" data-action="refresh-invites" '+(state.invitesLoading?'disabled':'')+'>↻ Atualizar convites</button></div>'+
    '<div class="ops-invite-stats">'+summaryCards+'</div>'+
    '<div class="ops-invite-layout"><section class="ops-invite-list-panel"><div class="ops-invite-section-head"><div><h2>Convites enviados</h2><p>Histórico de acessos liberados para o beta.</p></div>'+
    '<span class="ops-invite-records">'+(ready?state.invites.length:'—')+' REGISTROS</span></div>'+
    '<div class="ops-invite-filterbar"><div class="ops-invite-searchbox"><span aria-hidden="true">⌕</span><input id="ops-invite-search" type="search" placeholder="Buscar e-mail do convidado" autocomplete="off" aria-label="Buscar convites" value="'+esc(state.inviteQuery)+'"></div>'+
    '<div class="ops-invite-tabs" aria-label="Filtrar convites">'+statuses.map(s=>'<button type="button" data-action="invite-filter" data-filter="'+s[0]+'" class="'+(state.inviteFilter===s[0]?'active':'')+'">'+s[1]+(ready&&s[0]!=='todos'?'<span>'+counts[s[0]]+'</span>':'')+'</button>').join('')+'</div></div>'+
    list+'</section>'+
    '<aside class="ops-invite-compose"><div class="ops-invite-compose-head"><span class="ops-invite-compose-icon">✦</span><span class="pill green">Acesso exclusivo</span></div>'+
    '<h2>Um novo negócio<br>começa aqui.</h2>'+
    '<p>Gere um link individual para alguém testar e criar sua própria vitrine.</p>'+
    '<form id="invite-form"><label class="field">E-mail do convidado<input id="ops-invite-email" name="email" type="email" maxlength="320" required placeholder="exemplo@empresa.com" autocomplete="email"></label>'+
    '<div class="ops-invite-validity"><span aria-hidden="true">◷</span><div><strong>Validade: 14 dias</strong><small>O link funciona uma única vez</small></div></div>'+
    '<button class="button primary ops-invite-create" type="submit" '+(state.busy?'disabled':'')+'>Gerar convite <span aria-hidden="true">↗</span></button></form>'+
    '<p class="ops-invite-compose-note">O sistema não envia e-mail automaticamente. Você compartilha o link com a pessoa.</p>'+
    '</aside></div>'+feedback+
    '<div class="ops-footnote"><span class="ops-footnote-symbol">i</span><div><strong>Beta controlado, sem cadastro público.</strong>'+
    '<p>Convites usados não podem ser reutilizados. Convites pendentes podem ser cancelados. Links antigos não ficam recuperáveis, por segurança.</p></div></div>'+
    '</section>';
}

function testerDate(value) {
  if(!value)return '—';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
}
function filteredTesters() {
  const list=state.testers?.testers || [];
  const query=String(state.testerQuery||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return list.filter(t=>(state.testerStatus==='todos'||
      (state.testerStatus==='ativos'&&t.enabled)||
      (state.testerStatus==='inativos'&&!t.enabled)) &&
      (!query||[t.email,t.businessName,t.notes].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)));
}
function testerRow(t) {
  const status=t.enabled?'Ativo':'Inativo';
  return '<div class="ops-tester-row">'+
   '<div class="ops-tester-member"><div class="ops-tester-avatar">'+esc(String(t.email||'?').slice(0,1).toUpperCase())+'</div>'+
     '<div class="ops-tester-person"><strong>'+esc(t.email)+'</strong><span>'+esc(t.businessName||'Negócio ainda não configurado')+'</span></div></div>'+
   '<div class="ops-tester-note">'+esc(t.notes||'Sem observações')+'</div>'+
   '<div><span class="ops-tester-status '+(t.enabled?'active':'inactive')+'"><i></i>'+status+'</span></div>'+
   '<div class="ops-tester-date">'+testerDate(t.createdAt)+'</div>'+
   '<div class="ops-tester-actions"><button type="button" data-action="tester-details" data-id="'+esc(t.userId)+'" class="ops-tester-detail-btn">Gerenciar <span>↗</span></button></div>'+
  '</div>';
}
function updateTesterRows(){
  const list=document.getElementById('ops-tester-rows');
  const count=document.getElementById('ops-tester-results');
  if(list)list.innerHTML=filteredTesters().length?filteredTesters().map(testerRow).join(''):'<div class="ops-tester-empty">Nenhum tester corresponde aos filtros.</div>';
  if(count)count.textContent=filteredTesters().length+' participante(s) exibido(s)';
}
function testerDetailPanel() {
  if(!state.testerDetailId)return '';
  const t=(state.testers?.testers||[]).find(t=>t.userId===state.testerDetailId);
  if(!t)return '';
  return '<div class="modal-backdrop"><div class="modal ops-tester-modal" role="dialog" aria-modal="true" aria-labelledby="ops-tester-modal-title">'+
   '<div class="ops-tester-modal-head"><div><p class="kicker">Detalhes do tester</p><h2 id="ops-tester-modal-title">Gerenciar participante</h2></div>'+
   '<button class="close" data-action="close-tester-details" type="button" aria-label="Fechar">×</button></div>'+
   '<div class="ops-tester-person-meta"><span class="ops-tester-avatar">'+esc(t.email[0].toUpperCase())+'</span>'+
    '<div><strong>'+esc(t.email)+'</strong><small>'+esc(t.businessName||'Sem negócio configurado')+'</small></div></div>'+
   '<div class="ops-tester-detail-meta"><span class="ops-tester-status '+(t.enabled?'active':'inactive')+'"><i></i>'+(t.enabled?'Ativo':'Inativo')+'</span>'+
     '<span class="ops-tester-detail-date">Adicionado em '+testerDate(t.createdAt)+'</span></div>'+
   '<form id="tester-notes-form"><input type="hidden" name="userId" value="'+esc(t.userId)+'">'+
     '<label class="field">Observações internas<textarea name="notes" maxlength="280" rows="3" placeholder="Ex.: testes de fotos e vídeos">'+esc(t.notes||'')+'</textarea></label>'+
     '<div class="ops-tester-modal-actions"><button type="submit" class="button secondary">Salvar observação</button>'+
       '<button type="button" class="button '+(t.enabled?'danger':'lime')+'" data-action="toggle-tester" data-id="'+esc(t.userId)+'">'+(t.enabled?'Desativar tester':'Ativar tester')+'</button></div>'+
   '</form><p class="ops-tester-safety-note">Desativar o status de tester não bloqueia a conta nem altera sua vitrine. O usuário mantém o login e os dados.</p>'+
  '</div></div>';
}
function adminTestersPage() {
  if(!state.user?.isAdmin)return '<div class="empty">Acesso restrito ao administrador.</div>';
  const data=state.testers;
  const loading=state.testersLoading;
  const list=data?.testers||[];
  const active=list.filter(t=>t.enabled).length;
  const inactive=list.length-active;
  const counters=[['Participantes',list.length,'01'],['Testers ativos',active,'02'],['Testers inativos',inactive,'03']];
  const countersHTML='<div class="ops-tester-metrics">'+counters.map((c,i)=>
    '<article class="ops-tester-metric '+(!i?'highlight':'')+'"><div class="ops-tester-metric-head"><span>'+c[0]+'</span><small>'+c[2]+'</small></div>'+
    '<strong>'+(data?c[1].toLocaleString('pt-BR'):'—')+'</strong><p>'+(!i?'Cadastrados para testes':i===1?'Participação habilitada':'Participação desabilitada')+'</p></article>').join('')+'</div>';
  const listHTML=loading&&!data?'<div class="ops-empty">Carregando testers…</div>':
    !data?'<div class="ops-error"><strong>Testers indisponíveis</strong><p>'+esc(state.testersError||'Não foi possível consultar os registros.')+
      '</p><button class="button secondary" data-action="refresh-testers" type="button">Tentar novamente</button></div>':
    '<div class="ops-tester-toolbar"><div class="ops-tester-search"><span aria-hidden="true">⌕</span><input id="ops-tester-search" type="search" autocomplete="off" placeholder="Buscar email ou negócio" aria-label="Buscar testers" value="'+esc(state.testerQuery)+'"></div>'+
      '<div class="ops-tester-filter" role="group" aria-label="Filtrar testers">'+
       [['todos','Todos'],['ativos','Ativos'],['inativos','Inativos']].map(i=>'<button type="button" data-action="tester-filter" data-filter="'+i[0]+'" class="'+(state.testerStatus===i[0]?'selected':'')+'">'+i[1]+'</button>').join('')+
      '</div></div>'+
    '<div class="ops-tester-table"><div class="ops-tester-table-header"><span>PARTICIPANTE / NEGÓCIO</span><span>OBSERVAÇÕES</span><span>STATUS</span><span>CADASTRO</span><span></span></div>'+
    '<div id="ops-tester-rows">'+(filteredTesters().length?filteredTesters().map(testerRow).join(''):'<div class="ops-tester-empty">Nenhum tester corresponde aos filtros.</div>')+'</div></div>'+
    '<div class="ops-tester-bottom"><span id="ops-tester-results">'+filteredTesters().length+' participante(s) exibido(s)</span><span>'+(data.hasMore?'Mostrando os 100 mais recentes':'Atualize para consultar novamente')+'</span></div>';
  return '<section class="ops-page ops-testers-page">'+
    '<div class="ops-topline"><span class="ops-overline"><span class="ops-online-dot"></span> VITRINE / ADMINISTRAÇÃO</span><span class="pill purple">Área do fundador</span></div>'+
    '<div class="ops-heading"><div><p class="kicker">Gestão de testers</p><h1>Pessoas que<br><em>fazem evoluir.</em></h1>'+
    '<p class="lead">Organize quem participa dos testes do Vitrine, acompanhe o status e registre pequenas observações.</p></div>'+
    '<button class="button secondary ops-refresh" type="button" data-action="refresh-testers" '+(loading?'disabled':'')+'>↻ Atualizar lista</button></div>'+
    countersHTML+
    '<div class="ops-testers-layout"><section class="ops-testers-panel"><div class="ops-testers-panel-head"><div><h2>Participantes do beta</h2>'+
    '<p>Contas existentes que você marcou como testers.</p></div><span class="ops-tester-count">'+(data?list.length:'—')+' REGISTROS</span></div>'+
    listHTML+'</section>'+
    '<aside class="ops-testers-create"><div class="ops-testers-create-top"><div class="ops-tester-add-icon">✦</div><span class="pill green">Beta fechado</span></div>'+
    '<h2>Adicionar<br>um tester.</h2><p>Inclua alguém que já tenha criado uma conta no Vitrine. Não é necessário gerar outra senha.</p>'+
    '<form id="tester-create-form"><label class="field">Email da conta<input name="email" type="email" placeholder="pessoa@exemplo.com" maxlength="320" autocomplete="email" required></label>'+
    '<label class="field">Observação (opcional)<textarea name="notes" maxlength="280" rows="3" placeholder="Ex.: validar fluxo pelo celular"></textarea></label>'+
    '<button class="button primary ops-tester-create-btn" type="submit">Adicionar tester <span>↗</span></button></form>'+
    '<p class="ops-tester-create-note">A pessoa ainda não tem conta? Gere primeiro um convite na área de Convites Beta.</p>'+
    '</aside></div>'+
    '<div class="ops-footnote"><span class="ops-footnote-symbol">i</span><div><strong>Status de tester não é permissão de acesso.</strong>'+
    '<p>Ativar ou desativar a classificação não bloqueia login nem modifica vitrines. Apenas o administrador pode alterar esses registros.</p></div></div>'+
    '</section>'+testerDetailPanel();
}
function systemDate(date){
  if(!date)return '—';
  const d=new Date(date);
  return Number.isNaN(d.getTime())?'—':d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
}
function systemPage(){
  if(!state.user?.isAdmin)return '<div class="empty">Acesso restrito ao administrador.</div>';
  const report=state.systemReport;
  const services=[
    {id:'app',number:'01',name:'Servidor Vitrine',tag:'Hospedagem / Render',description:'Confirma que a aplicação atual responde às requisições.',icon:'⌘'},
    {id:'database',number:'02',name:'Banco de dados',tag:'Supabase / API',description:'Verifica consultas de leitura aos dados operacionais.',icon:'▤'},
    {id:'auth',number:'03',name:'Autenticação',tag:'Supabase / Auth',description:'Consulta o serviço de contas com segurança.',icon:'◇'},
    {id:'storage',number:'04',name:'Armazenamento',tag:'Supabase / Storage',description:'Confere o bucket de imagens da vitrine.',icon:'▧'}
  ];
  const failed=report?services.filter(s=>!report.services?.[s.id]?.healthy).length:0;
  const headline=report?(failed===0?'Serviços respondendo normalmente.':failed+' serviço(s) precisam de atenção.'):'Sua operação em um só lugar.';
  const summary=report?(failed===0?'Todos os quatro serviços responderam a esta verificação.':'Consulte as informações abaixo para identificar o que não respondeu.'):'Verifique os serviços essenciais do Vitrine sem precisar abrir vários painéis.';
  const cards=report?'<div class="ops-system-services">'+services.map(s=>{
    const live=!!report.services[s.id]?.healthy;
    return '<article class="ops-system-service"><div class="ops-system-service-head"><span class="ops-system-icon" aria-hidden="true">'+s.icon+'</span>'+
       '<span class="ops-system-state '+(live?'ok':'issue')+'"><i></i>'+(live?'Respondendo':'Não confirmado')+'</span></div>'+
       '<div class="ops-system-service-meta">'+s.number+' / '+s.tag+'</div>'+
       '<h3>'+s.name+'</h3><p>'+s.description+'</p>'+
       '<div class="ops-system-service-check">'+esc(report.services[s.id]?.detail||'Estado indisponível.')+'</div></article>';
  }).join('')+'</div>':'';
  const data=report?.recent;
  const activity=report?[
    {label:'Último negócio criado',value:data.dataAvailable?(data.business?.name||'Nenhum negócio cadastrado'):'Não disponível',when:data.business?.createdAt,icon:'▦'},
    {label:'Último convite gerado',value:data.dataAvailable?(data.invite?.email||'Nenhum convite cadastrado'):'Não disponível',when:data.invite?.createdAt,icon:'✉'},
    {label:'Último acesso desta conta',value:data.adminLoginAt?'Login identificado pelo Supabase':'Informação indisponível',when:data.adminLoginAt,icon:'◷'}
  ].map(a=>'<div class="ops-system-activity-row"><span class="ops-system-activity-icon" aria-hidden="true">'+a.icon+'</span>'+
      '<div class="ops-system-activity-copy"><strong>'+a.label+'</strong><span>'+esc(a.value)+'</span></div>'+
      '<span class="ops-system-activity-time">'+(a.when?systemDate(a.when):'—')+'</span></div>').join(''):'';
  const body=state.systemLoading&&!report?'<div class="ops-empty">Verificando os serviços…</div>':
    !report?'<div class="ops-error"><strong>Diagnóstico indisponível</strong><p>'+esc(state.systemError||'Não foi possível consultar a infraestrutura.')+
      '</p><button class="button secondary" type="button" data-action="refresh-system">Tentar novamente</button></div>':
    '<div class="ops-system-grid-head"><div><h2>Serviços essenciais</h2><p>Resultados obtidos somente nesta consulta.</p></div>'+
      '<span class="ops-system-timestamp">VERIFICADO EM '+systemDate(report.checkedAt)+'</span></div>'+cards+
      '<div class="ops-system-lower"><section class="ops-system-activity"><div class="ops-system-panel-title"><h2>Últimas atividades</h2><p>Registros administrativos, sem métricas de visitantes.</p></div>'+
       activity+'</section>'+
       '<aside class="ops-system-links"><div class="ops-system-panel-title"><h2>Acessos rápidos</h2><p>Abra os painéis oficiais quando precisar.</p></div>'+
        '<a href="https://dashboard.render.com/web/srv-dbfckpm7bikc73d0sgf0" target="_blank" rel="noopener noreferrer">Render <span>↗</span></a>'+
        '<a href="https://supabase.com/dashboard/project/uxoxxkufmqtkgyvpynyy" target="_blank" rel="noopener noreferrer">Supabase <span>↗</span></a>'+
        '<a href="https://github.com/NicolasBenNic/vitrine-beta-0" target="_blank" rel="noopener noreferrer">GitHub <span>↗</span></a></aside></div>';
  return '<section class="ops-page ops-system-page">'+
    '<div class="ops-topline"><span class="ops-overline"><span class="ops-online-dot"></span> VITRINE / ADMINISTRAÇÃO</span><span class="pill purple">Área do fundador</span></div>'+
    '<div class="ops-heading"><div><p class="kicker">Saúde do sistema</p><h1>O Vitrine,<br><em>por dentro.</em></h1>'+
    '<p class="lead">Tudo o que você precisa saber sobre a operação técnica do beta, sem precisar entender logs ou servidores.</p></div>'+
    '<button class="button secondary ops-refresh" type="button" data-action="refresh-system" '+(state.systemLoading?'disabled':'')+'>↻ Verificar agora</button></div>'+
    '<div class="ops-system-hero"><div class="ops-system-hero-left"><span class="ops-system-hero-caption">SITUAÇÃO DA OPERAÇÃO · AGORA</span>'+
      '<h2>'+headline+'</h2><p>'+summary+'</p></div>'+
      '<div class="ops-system-hero-icon '+(report&&failed>0?'attention':'')+'" aria-hidden="true">'+(report&&failed>0?'!':'✓')+'</div></div>'+
    body+
    '<div class="ops-footnote"><span class="ops-footnote-symbol">i</span><div><strong>Verificação pontual, não monitoramento 24 horas.</strong>'+
    '<p>O status do servidor confirma apenas que esta instância respondeu. Não representa o status global do Render. O painel não rastreia visitas nem gera analytics.</p></div></div>'+
    '</section>';
}
function itemModal() {
  if (!state.modal) return '';
  const item=state.modal.id ? state.items.find(i=>i.id===state.modal.id) : null;
  const data=state.editDraft || item || {name:'',category:'Serviços',description:'',price_cents:0,image_url:''};
  return '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="Editor de serviços">' +
    '<div class="modal-header"><div><p class="kicker">seu catálogo</p><h2>' + (item?'Editar serviço':'Novo serviço') + '</h2></div><button class="close" type="button" data-action="close-modal" aria-label="Fechar">×</button></div>' +
    '<form id="item-form"><div class="form-grid"><label class="field full">Nome do serviço<input required maxlength="120" name="name" value="' + esc(data.name) + '" placeholder="Ex.: Corte masculino"></label>' +
    '<label class="field">Categoria<input maxlength="80" name="category" required value="' + esc(data.category) + '"></label>' +
    '<label class="field">Preço (R$)<input name="price" required inputmode="decimal" value="' + esc(data.priceInput !== undefined ? data.priceInput : (data.price_cents / 100).toFixed(2).replace('.',',')) + '"></label>' +
    '<label class="field full">Descrição<textarea name="description" rows="3" maxlength="1500">' + esc(data.description) + '</textarea></label></div>' +
    '<div class="upload-row" style="margin-top:15px"><label>Imagem do serviço · JPG, PNG ou WebP, até 10 MB</label><input type="file" data-upload="item" accept="image/jpeg,image/png,image/webp">' +
    (state.editImagePath?'<p class="small">✓ Imagem selecionada</p>':'') +
    (item?.image_url || state.editImageURL?'<img class="modal-img" src="'+esc(state.editImageURL||item.image_url)+'" alt="Prévia da imagem">':'')+'</div>' +
    '<div class="actions" style="justify-content:space-between">'+(item?'<button class="button danger" type="button" data-action="delete-item" data-id="'+esc(item.id)+'">Excluir</button>':'<span></span>')+
    '<div class="actions" style="margin:0"><button class="button secondary" type="button" data-action="close-modal">Cancelar</button><button class="button lime" type="submit">Salvar serviço</button></div></div></form></div></div>';
}
function renderApp() {
  if (!state.user) return renderAuth();
  const navigation=[['home','⌂','Minha vitrine'],['catalog','▦','Produtos e serviços'],['publish','↗','Publicar e compartilhar']];
  if (state.user.isAdmin) { navigation.unshift(['admin-summary','◫','Resumo ADM'],['admin-businesses','▦','Negócios'],['invites','✉','Convites beta'],['admin-testers','◇','Testers'],['admin-system','⌘','Sistema']); }
  const content={home:homepage,catalog:catalogPage,publish:publishPage,invites:invitesPage,'admin-summary':adminSummaryPage,'admin-businesses':adminBusinessesPage,'admin-testers':adminTestersPage,'admin-system':systemPage}[state.tab] || homepage;
  root.innerHTML='<div class="shell"><aside class="sidebar">'+logo()+
    '<div><p class="kicker" style="margin:0 12px 15px">'+(state.user.isAdmin?'operação & criação':'painel de criação')+'</p><nav class="nav">' +
    navigation.map(([tab,icon,label])=>'<button type="button" data-action="tab" data-tab="'+tab+'" class="'+(state.tab===tab?'active':'')+'"><span>'+icon+'</span> '+label+'</button>').join('') +
    '</nav></div><div class="sidebar-bottom"><div class="side-user">'+esc(state.user.email)+'</div><button class="plain-btn" type="button" data-action="logout">Sair da conta ↗</button></div></aside>' +
    '<main class="main"><div class="content"><div class="topbar"><span class="kicker">Vitrine Beta · exclusivo</span><div class="topbar-right">'+(state.user.isTester?'<span class="pill purple">Tester · acesso ativo</span>':'')+'<span class="pill '+(state.business.is_published?'green':'')+'">'+(state.business.is_published?'Publicado':'Rascunho')+'</span></div></div>' +
    content()+'</div></main></div>'+itemModal();
}
async function reload() {
  const data=await request('/api/me');
  state.user=data.user;state.business=data.business;state.items=data.items||[];
  state.previewIndex=Math.min(state.previewIndex,Math.max(0,state.items.length-1));
  renderApp();
}
async function loadAdminSummary() {
  if (!state.user?.isAdmin) return;
  state.adminSummaryLoading=true;
  state.adminSummaryError='';
  renderApp();
  try {
    state.adminSummary=await request('/api/admin/summary');
  } catch (error) {
    state.adminSummary=null;
    state.adminSummaryError=error.message || 'Erro ao consultar o servidor.';
  } finally {
    state.adminSummaryLoading=false;
    renderApp();
  }
}
async function loadAdminBusinesses() {
  if (!state.user?.isAdmin) return;
  state.adminBusinessesLoading=true;
  state.adminBusinessesError='';
  renderApp();
  try {
    state.adminBusinesses=await request('/api/admin/businesses');
  } catch(error) {
    state.adminBusinesses=null;
    state.adminBusinessesError=error.message || 'Falha na consulta.';
  } finally {
    state.adminBusinessesLoading=false;
    renderApp();
  }
}
async function loadAdminSystem(){
  if(!state.user?.isAdmin)return;
  state.systemLoading=true;
  state.systemError='';
  renderApp();
  try{
    state.systemReport=await request('/api/admin/system');
  }catch(error){
    state.systemReport=null;
    state.systemError=error.message||'Não foi possível verificar a infraestrutura.';
  }finally{
    state.systemLoading=false;
    renderApp();
  }
}
async function loadAdminTesters(){
  if(!state.user?.isAdmin)return;
  state.testersLoading=true;
  state.testersError='';
  renderApp();
  try{
    state.testers=await request('/api/admin/testers');
    state.testersLoaded=true;
  }catch(error){
    state.testersError=error.message||'Erro na consulta.';
    if(!state.testersLoaded)state.testers=null;
  }finally{
    state.testersLoading=false;
    renderApp();
  }
}
async function loadInvites() {
  if (!state.user?.isAdmin) return;
  state.invitesLoading=true;
  state.invitesError='';
  renderApp();
  try {
    const data=await request('/api/admin/invites');
    state.invites=data.invites||[];
    state.invitesHasMore=Boolean(data.hasMore);
    state.invitesLoaded=true;
  } catch(error) {
    state.invitesError=error.message || 'Não foi possível carregar convites.';
    if(!state.invitesLoaded)state.invites=[];
  } finally {
    state.invitesLoading=false;
    renderApp();
  }
}
function publicList() {
  const list=state.public?.items || [];
  return state.publicFilter==='Todos'?list:list.filter(i=>i.category===state.publicFilter);
}
function renderPublic() {
  if (!state.public) return;
  const b=state.public.business, list=publicList();
  state.publicIndex=Math.min(state.publicIndex,Math.max(0,list.length-1));
  const item=list[state.publicIndex];
  const categories=['Todos',...new Set(state.public.items.map(i=>i.category))];
  root.innerHTML='<div class="public-page"><div class="public-wrap"><header class="public-head"><div><p class="kicker" style="margin-bottom:7px">Bem-vindo à vitrine</p><h1>'+esc(b.name)+'</h1></div><span class="pill green">● Online</span></header>' +
    '<div class="public-filter">'+categories.map(c=>'<button class="chip '+(state.publicFilter===c?'active':'')+'" data-action="filter" data-category="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div>' +
    (item?'<div class="public-card">'+(item.image_url?'<img src="'+esc(item.image_url)+'" alt="'+esc(item.name)+'">':'')+
    '<div class="public-shade"></div><div class="public-info"><span class="pill green">'+esc(item.category)+'</span><h2>'+esc(item.name)+'</h2>'+
    '<p>'+esc(item.description||'')+'</p><strong>'+money(item.price_cents)+'</strong></div></div>'+
    '<div class="public-actions"><button class="circle" type="button" data-action="public-prev" aria-label="Serviço anterior">❮</button>'+
    '<button class="circle" type="button" data-action="favorite" aria-label="Favoritar">'+(localStorage.getItem('vitrine-fav-'+item.id)==='yes'?'♥':'♡')+'</button>'+
    '<button class="circle" type="button" data-action="public-next" aria-label="Próximo serviço">❯</button>'+
    '<button class="button lime" type="button" data-action="contact">Chamar no WhatsApp ↗</button></div>'+
    '<div class="public-details">'+(state.publicIndex+1)+' de '+list.length+' serviços · '+esc(b.description||'')+'</div>':
    '<div class="empty" style="flex:1"><h2>Nenhum serviço nesta categoria.</h2></div>')+
    '<div class="footer-note">Criado com Vitrine · Beta</div></div></div>';
}
async function loadPublic() {
  try {
    state.public=await request('/api/public/'+encodeURIComponent(publicSlug));
    document.title=state.public.business.name+' · Vitrine';
    renderPublic();
  } catch(e) {
    root.innerHTML='<div class="boot"><span class="brand-icon">V.</span><h2>Esta vitrine não está disponível.</h2><p class="muted">'+esc(e.message)+'</p></div>';
  }
}
async function runCommand(command) {
  const text=command.trim();
  if (/^(publique|publicar|publique a vitrine)$/i.test(text)) {
    await request('/api/publish',{method:'POST',...jsonBody({publish:true})});
    await reload();toast('Sua vitrine está publicada.');return;
  }
  const match=/^adicione?\s+(?:um\s+|uma\s+)?(.+?)\s+por\s+(?:r\$\s*)?([\d.,]+)$/i.exec(text);
  if (!match) { toast('Exemplos: "Adicione barba por R$ 40" ou "Publique".',true);return; }
  await request('/api/items',{method:'POST',...jsonBody({name:match[1],category:'Serviços',description:'',price_cents:asCents(match[2]),image_path:null})});
  await reload();toast('Serviço criado. Adicione uma foto quando quiser.');
}
async function onForm(event) {
  event.preventDefault();
  const form=event.target;
  const fd=new FormData(form);
  if (state.busy) return;
  state.busy=true;
  try {
    if(form.id==='auth-form') {
      const payload={email:fd.get('email'),password:fd.get('password')};
      const action=inviteToken?'/api/auth/register':'/api/auth/login';
      if(inviteToken){payload.invite=inviteToken;payload.businessName=fd.get('businessName');}
      await request(action,{method:'POST',...jsonBody(payload)});
      inviteToken=''; history.replaceState({},'', '/');
      await reload();toast('Bem-vindo à Vitrine.');
    } else if (form.id==='business-form') {
      await request('/api/business',{method:'PUT',...jsonBody({name:fd.get('name'),description:fd.get('description'),whatsapp:fd.get('whatsapp'),logo_path:state.business.logo_path})});
      await reload();toast('Dados do negócio salvos.');
    } else if (form.id==='item-form') {
      const payload={name:fd.get('name'),category:fd.get('category'),description:fd.get('description'),price_cents:asCents(fd.get('price')),image_path:state.editImagePath||null};
      const editing=state.modal?.id;
      if(editing){
        const old=state.items.find(i=>i.id===editing);
        if(old && old.price_cents !== payload.price_cents) {
          if(!confirm('Confirmar mudança de preço para '+money(payload.price_cents)+'?')) return;
          payload.confirmPrice=true;
        }
      }
      await request('/api/items'+(editing?'/'+editing:''),{method:editing?'PATCH':'POST',...jsonBody(payload)});
      state.modal=null;state.editDraft=null;state.editImagePath='';state.editImageURL='';
      await reload();toast('Serviço salvo.');
    } else if(form.id==='command-form') {
      await runCommand(String(fd.get('command')));
    } else if(form.id==='tester-create-form') {
      await request('/api/admin/testers',{method:'POST',...jsonBody({email:fd.get('email'),notes:fd.get('notes')})});
      state.adminSummary=null;state.testerQuery='';state.testerStatus='todos';
      await loadAdminTesters();toast('Tester cadastrado.');
    } else if(form.id==='tester-notes-form') {
      const userId=String(fd.get('userId'));
      await request('/api/admin/testers/'+encodeURIComponent(userId),{method:'PATCH',...jsonBody({notes:fd.get('notes')})});
      state.testerDetailId=null;await loadAdminTesters();toast('Observação salva.');
    } else if(form.id==='invite-form') {
      const data=await request('/api/admin/invites',{method:'POST',...jsonBody({email:fd.get('email')})});
      state.inviteLink=location.origin+data.path;
      state.inviteLinkEmail=data.email || String(fd.get('email'));
      state.inviteFilter='todos';state.inviteQuery='';
      await loadInvites();toast('Convite gerado. Copie e envie o link.');
    }
  } catch(e) { toast(e.message,true); } finally { state.busy=false; if(form.id==='invite-form'&&state.user?.isAdmin)renderApp(); }
}
async function onClick(event) {
  const button=event.target.closest('[data-action]');
  if (!button) return;
  const action=button.dataset.action;
  if (state.busy) return;
  try {
    if(publicSlug) {
      const list=publicList(), item=list[state.publicIndex];
      if(action==='public-next' || action==='public-prev') {state.publicIndex=(state.publicIndex+(action==='public-next'?1:-1)+list.length)%Math.max(1,list.length);renderPublic();}
      else if(action==='filter') {state.publicFilter=button.dataset.category;state.publicIndex=0;renderPublic();}
      else if(action==='favorite'&&item){const key='vitrine-fav-'+item.id;localStorage.setItem(key,localStorage.getItem(key)==='yes'?'no':'yes');renderPublic();}
      else if(action==='contact'&&item){if(!state.public.business.whatsapp)return toast('Este negócio ainda não cadastrou WhatsApp.',true);
        const message='Olá! Gostaria de saber mais sobre '+item.name+' ('+money(item.price_cents)+').';
        window.open('https://wa.me/'+state.public.business.whatsapp+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
      }
      return;
    }
    if(action==='tab') {state.tab=button.dataset.tab;if(state.tab==='invites')await loadInvites();if(state.tab==='admin-summary')await loadAdminSummary();if(state.tab==='admin-businesses')await loadAdminBusinesses();if(state.tab==='admin-testers')await loadAdminTesters();if(state.tab==='admin-system')await loadAdminSystem();renderApp();}
    else if(action==='refresh-summary') {await loadAdminSummary();}
    else if(action==='refresh-businesses') {await loadAdminBusinesses();}
    else if(action==='refresh-invites') {await loadInvites();}
    else if(action==='refresh-testers') {await loadAdminTesters();}
    else if(action==='refresh-system') {await loadAdminSystem();}
    else if(action==='tester-filter') {state.testerStatus=button.dataset.filter;renderApp();}
    else if(action==='tester-details') {state.testerDetailId=button.dataset.id;renderApp();}
    else if(action==='close-tester-details') {state.testerDetailId=null;renderApp();}
    else if(action==='toggle-tester') {
      const t=state.testers?.testers.find(x=>x.userId===button.dataset.id);
      if(!t)return;
      const enabled=!t.enabled;
      if(!enabled&&!confirm('Desativar '+t.email+' como tester? Isso NÃO bloqueia a conta nem impede login.'))return;
      state.busy=true;
      try {
        await request('/api/admin/testers/'+encodeURIComponent(t.userId),{method:'PATCH',...jsonBody({enabled,confirm:!enabled})});
        state.testerDetailId=null;state.adminSummary=null;await loadAdminTesters();
        toast(enabled?'Tester ativado.':'Status de tester desativado.');
      } finally {state.busy=false;}
    }
    else if(action==='invite-filter') {state.inviteFilter=button.dataset.filter;renderApp();}
    else if(action==='repeat-invite') {const field=document.getElementById('ops-invite-email');if(field){field.value=button.dataset.email;field.scrollIntoView({behavior:'smooth',block:'center'});field.focus();toast('E-mail preenchido. Confirme em Gerar convite.');}}
    else if(action==='cancel-invite') {
      const inv=state.invites.find(x=>x.id===button.dataset.id);
      if(!inv || inviteStatus(inv)!=='pending')return;
      if(!confirm('Cancelar o convite para '+inv.email+'? O link enviado deixará de funcionar.'))return;
      state.busy=true;
      try {
        await request('/api/admin/invites/'+encodeURIComponent(inv.id)+'/cancel',{method:'POST',...jsonBody({confirm:true})});
        state.inviteLink='';state.inviteLinkEmail='';state.adminSummary=null;
        await loadInvites();toast('Convite cancelado.');
      } finally {state.busy=false;}
    }
    else if(action==='business-details'){state.businessDetailId=button.dataset.id;renderApp();}
    else if(action==='close-business-detail'){state.businessDetailId=null;renderApp();}
    else if(action==='copy-business-link'){const b=state.adminBusinesses?.businesses.find(x=>x.id===button.dataset.id);if(b&&b.isPublished)await copy(businessLink(b));}
    else if(action==='admin-unpublish'){
      const b=state.adminBusinesses?.businesses.find(x=>x.id===button.dataset.id);
      if(!b||!b.isPublished)return;
      if(!confirm('Retirar a vitrine "'+b.name+'" do ar? O proprietário poderá publicá-la novamente.'))return;
      state.busy=true;
      try {
        await request('/api/admin/businesses/'+encodeURIComponent(b.id)+'/unpublish',{method:'POST',...jsonBody({confirm:true})});
        state.businessDetailId=null;
        state.adminSummary=null;
        await loadAdminBusinesses();toast('Vitrine retirada do ar.');
      } finally {state.busy=false;}
    }
    else if(action==='logout'){await request('/api/auth/logout',{method:'POST'});state.user=null;state.business=null;renderAuth();}
    else if(action==='add-item'||action==='quick-add'){state.modal={};state.editDraft=null;state.editImagePath='';state.editImageURL='';renderApp();}
    else if(action==='edit-item'){const item=state.items.find(i=>i.id===button.dataset.id);if(item){state.modal={id:item.id};state.editDraft=null;state.editImagePath=item.image_path||'';state.editImageURL=item.image_url||'';renderApp();}}
    else if(action==='close-modal'){state.modal=null;state.editDraft=null;renderApp();}
    else if(action==='preview-next'||action==='preview-prev'){state.previewIndex=(state.previewIndex+(action==='preview-next'?1:-1)+state.items.length)%Math.max(1,state.items.length);renderApp();}
    else if(action==='quick-publish'){await request('/api/publish',{method:'POST',...jsonBody({publish:true})});await reload();toast('Vitrine publicada.');}
    else if(action==='toggle-publish'){const published=!state.business.is_published;await request('/api/publish',{method:'POST',...jsonBody({publish:published})});await reload();toast(published?'Vitrine publicada.':'Vitrine retirada do ar.');}
    else if(action==='copy-link')await copy(link());
    else if(action==='copy-invite')await copy(state.inviteLink);
    else if(action==='delete-item'){if(!confirm('Excluir este serviço definitivamente?'))return;await request('/api/items/'+button.dataset.id,{method:'DELETE',...jsonBody({confirm:true})});state.modal=null;await reload();toast('Serviço excluído.');}
  } catch(e) { toast(e.message,true); }
}
async function onChange(event) {
  const target=event.target;
  if(target.type!=='file'||!target.dataset.upload||!target.files?.length)return;
  const file=target.files[0], purpose=target.dataset.upload;
  if(file.size>10*1024*1024)return toast('Imagem muito grande: máximo 10 MB.',true);
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return toast('Use JPG, PNG ou WebP.',true);
  if(purpose==='item') {
    const form=document.getElementById('item-form');
    if(form){ const draft=new FormData(form);state.editDraft={name:String(draft.get('name')||''),category:String(draft.get('category')||'Serviços'),description:String(draft.get('description')||''),priceInput:String(draft.get('price')||'0,00'),price_cents:0};}
  }
  state.busy=true;
  try {
    const data=await request('/api/upload',{method:'POST',headers:{'Content-Type':file.type},body:file});
    if(purpose==='item'){
      state.editImagePath=data.path;state.editImageURL=data.url;renderApp();
    } else if(purpose==='logo'){
      const form=document.getElementById('business-form');const draft=form?new FormData(form):null;
      await request('/api/business',{method:'PUT',...jsonBody({name:draft?.get('name')||state.business.name,description:draft?.get('description')||state.business.description,whatsapp:draft?.get('whatsapp')||state.business.whatsapp,logo_path:data.path})});
      await reload();
    }
    toast('Imagem enviada e salva.');
  }catch(e){toast(e.message,true);}finally{state.busy=false;}
}

root.addEventListener('input',event=>{
  if(event.target.id==='ops-tester-search'){
    state.testerQuery=event.target.value;
    updateTesterRows();
  }
  if(event.target.id==='ops-invite-search'){
    state.inviteQuery=event.target.value;
    updateInviteRows();
  }
  if(event.target.id==='ops-business-search'){
    state.adminBusinessQuery=event.target.value;
    renderBusinessRows();
  }
});
root.addEventListener('change',event=>{
  if(event.target.id==='ops-business-filter'){
    state.adminBusinessStatus=event.target.value;
    renderBusinessRows();
  }
});
root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&state.testerDetailId){
    state.testerDetailId=null;renderApp();
  }
  if(event.key==='Escape'&&state.businessDetailId){
    state.businessDetailId=null;renderApp();
  }
});
root.addEventListener('submit',onForm);
root.addEventListener('click',onClick);
root.addEventListener('change',onChange);
(async()=>{if(publicSlug)await loadPublic();else{
  try {await reload();} catch(e){ if(e.message.includes('Entre na sua conta')||e.message.includes('Sessão')||e.message.includes('login'))renderAuth();else {renderAuth();toast(e.message,true);} }
}})();
