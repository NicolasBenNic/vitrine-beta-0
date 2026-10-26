const root = document.getElementById('app');
const toastBox = document.getElementById('toast');
let inviteToken = new URLSearchParams(location.search).get('invite') || '';
const publicSlug = location.pathname.startsWith('/v/') ? location.pathname.slice(3) : '';
const state = { user:null, business:null, items:[], tab:'home', modal:null, editImagePath:'', previewIndex:0, editDraft:null, editImageURL:'', public:null, publicIndex:0, publicFilter:'Todos', invites:[], inviteLink:'', busy:false };
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
function invitesPage() {
  if (!state.user.isAdmin) return '<div class="empty">Acesso restrito.</div>';
  return '<div class="section-panel"><div class="heading"><div><p class="kicker">beta privado</p><h1>Convide seus<br><em>primeiros clientes.</em></h1><p class="lead">Você controla quem pode criar uma vitrine. Quem visita as vitrines publicadas não precisa de convite.</p></div></div>' +
    '<section class="card"><div class="card-head"><div><h2>Criar convite individual</h2><p>Validade de 14 dias · uso único</p></div></div>' +
    '<form id="invite-form"><label class="field">Email do convidado<input type="email" name="email" required placeholder="barbeiro@exemplo.com"></label>' +
    '<div class="actions"><button type="submit" class="button lime">Gerar convite →</button></div></form>' +
    (state.inviteLink?'<div class="divider"></div><p class="small"><strong>Link gerado — copie e envie ao convidado:</strong></p><p class="publish-url">' + esc(state.inviteLink) + '</p>' +
    '<button class="button secondary" data-action="copy-invite">Copiar convite</button>':'') +
    '</section><section class="card" style="margin-top:22px"><h2>Convites gerados</h2>' +
    (!state.invites.length?'<p class="muted small">Nenhum convite gerado ainda.</p>':state.invites.map(i => '<div class="invite-row"><div><strong>' + esc(i.email) + '</strong><br><span class="tiny muted">Expira: '+new Date(i.expires_at).toLocaleDateString('pt-BR')+'</span></div>' +
    '<span class="badge '+(i.used_at?'used':'')+'">'+(i.used_at?'Utilizado':new Date(i.expires_at)<new Date()?'Expirado':'Pendente')+'</span></div>').join('')) +
    '</section></div>';
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
  if (state.user.isAdmin) navigation.push(['invites','✉','Convites beta']);
  const content={home:homepage,catalog:catalogPage,publish:publishPage,invites:invitesPage}[state.tab] || homepage;
  root.innerHTML='<div class="shell"><aside class="sidebar">'+logo()+
    '<div><p class="kicker" style="margin:0 12px 15px">painel de criação</p><nav class="nav">' +
    navigation.map(([tab,icon,label])=>'<button type="button" data-action="tab" data-tab="'+tab+'" class="'+(state.tab===tab?'active':'')+'"><span>'+icon+'</span> '+label+'</button>').join('') +
    '</nav></div><div class="sidebar-bottom"><div class="side-user">'+esc(state.user.email)+'</div><button class="plain-btn" type="button" data-action="logout">Sair da conta ↗</button></div></aside>' +
    '<main class="main"><div class="content"><div class="topbar"><span class="kicker">Vitrine Beta · exclusivo</span><div class="topbar-right"><span class="pill '+(state.business.is_published?'green':'')+'">'+(state.business.is_published?'Publicado':'Rascunho')+'</span></div></div>' +
    content()+'</div></main></div>'+itemModal();
}
async function reload() {
  const data=await request('/api/me');
  state.user=data.user;state.business=data.business;state.items=data.items||[];
  state.previewIndex=Math.min(state.previewIndex,Math.max(0,state.items.length-1));
  renderApp();
}
async function loadInvites() {
  if (!state.user?.isAdmin) return;
  const data=await request('/api/admin/invites');
  state.invites=data.invites||[];
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
    } else if(form.id==='invite-form') {
      const data=await request('/api/admin/invites',{method:'POST',...jsonBody({email:fd.get('email')})});
      state.inviteLink=location.origin+data.path;
      await loadInvites();renderApp();toast('Convite gerado. Copie e envie o link.');
    }
  } catch(e) { toast(e.message,true); } finally { state.busy=false; }
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
    if(action==='tab') {state.tab=button.dataset.tab;if(state.tab==='invites')await loadInvites();renderApp();}
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
root.addEventListener('submit',onForm);
root.addEventListener('click',onClick);
root.addEventListener('change',onChange);
(async()=>{if(publicSlug)await loadPublic();else{
  try {await reload();} catch(e){ if(e.message.includes('Entre na sua conta')||e.message.includes('Sessão')||e.message.includes('login'))renderAuth();else {renderAuth();toast(e.message,true);} }
}})();
