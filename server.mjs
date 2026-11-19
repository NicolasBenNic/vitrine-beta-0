import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
const SB = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN = (process.env.VITRINE_ADMIN_EMAIL || '').trim().toLowerCase();
const IS_PROD = process.env.NODE_ENV === 'production';
const MAX_IMAGE = 10 * 1024 * 1024;
const throttle = new Map();
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function fail(status, message) { throw new HttpError(status, message); }
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Informe um email válido.');
  return email;
}
function nameValue(value, max = 120) {
  const name = String(value || '').trim();
  if (!name || name.length > max) fail(400, 'Informe um nome válido.');
  return name;
}
function maxText(value, max) {
  const text = String(value || '').trim();
  if (text.length > max) fail(400, 'Texto muito longo.');
  return text;
}
function slugify(text) {
  return (text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 38) || 'vitrine') + '-' + randomBytes(3).toString('hex');
}
function rateLimit(req, bucket, max = 15) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const key = bucket + ':' + ip;
  const now = Date.now();
  const entry = throttle.get(key);
  if (!entry || now - entry.since > 15 * 60 * 1000) throttle.set(key, { since: now, count: 1 });
  else if (++entry.count > max) fail(429, 'Muitas tentativas. Tente novamente mais tarde.');
  if (throttle.size > 4000) for (const [k, v] of throttle) if (now - v.since > 20 * 60 * 1000) throttle.delete(k);
}
async function readBody(req, limit = 150000) {
  const chunks = [];
  let length = 0;
  for await (const part of req) {
    length += part.length;
    if (length > limit) fail(413, 'Arquivo ou solicitação muito grande.');
    chunks.push(part);
  }
  return Buffer.concat(chunks);
}
async function readJSON(req) {
  const bytes = await readBody(req);
  try {
    const value = JSON.parse(bytes.toString('utf8') || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Dados inválidos.');
    return value;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    fail(400, 'JSON inválido.');
  }
}
function requireConfig() {
  if (!SB.startsWith('https://') || !SECRET) fail(503, 'Configuração do Supabase pendente no Render.');
}
async function call(path, method = 'GET', value, options = {}) {
  requireConfig();
  const headers = { apikey: SECRET, Authorization: 'Bearer ' + (options.userToken || SECRET) };
  if (value !== undefined) headers['Content-Type'] = 'application/json';
  if (options.prefer) headers.Prefer = options.prefer;
  const response = await fetch(SB + path, {
    method, headers, body: value === undefined ? undefined : JSON.stringify(value), signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) {
    if (options.allowUnauthorized && (response.status === 401 || response.status === 403)) return null;
    const upstream = typeof data?.msg === 'string' ? data.msg : (data?.message || data?.error_description);
    console.error('Supabase operation failed:', method, path.split('?')[0], response.status, upstream || '');
    fail([400, 401, 403, 404, 409, 422].includes(response.status) ? response.status : 502,
      response.status === 400 || response.status === 422 ? 'Dados não aceitos pelo serviço.' : 'Não foi possível concluir a operação.');
  }
  return data;
}
function query(table, fields = {}) {
  const p = new URLSearchParams(fields);
  return '/rest/v1/' + table + (p.size ? '?' + p.toString() : '');
}
async function select(table, params) {
  const result = await call(query(table, params));
  return Array.isArray(result) ? result : [];
}
// Exact operational counts for the founder console. This runs only on the server.
async function countRows(table, filters = {}) {
  requireConfig();
  const path = query(table, { select: 'id', ...filters });
  const response = await fetch(SB + path, {
    method: 'GET',
    headers: {
      apikey: SECRET,
      Authorization: 'Bearer ' + SECRET,
      Prefer: 'count=exact',
      Range: '0-0'
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    console.error('Founder summary count failed:', table, response.status);
    fail(502, 'Não foi possível carregar o resumo da operação.');
  }
  const header = response.headers.get('content-range') || '';
  const match = /\/(\d+)$/.exec(header);
  if (!match) {
    console.error('Missing exact count for', table);
    fail(502, 'Não foi possível conferir os totais da operação.');
  }
  return Number(match[1]);
}
async function insert(table, value) {
  const result = await call('/rest/v1/' + table, 'POST', value, { prefer: 'return=representation' });
  return result?.[0] || null;
}
async function patch(table, params, changes) {
  const result = await call(query(table, params), 'PATCH', changes, { prefer: 'return=representation' });
  return Array.isArray(result) ? result : [];
}
async function remove(table, params) {
  return call(query(table, params), 'DELETE', undefined, { prefer: 'return=representation' });
}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(s => {
    const index = s.indexOf('=');
    return index < 0 ? ['', ''] : [s.slice(0, index).trim(), s.slice(index + 1).trim()];
  }).filter(p => p[0]));
}
function setSession(res, data) {
  const flags = '; HttpOnly; SameSite=Lax; Path=/' + (IS_PROD ? '; Secure' : '');
  const access = String(data.access_token || '');
  const refresh = String(data.refresh_token || '');
  if (!access || !refresh) fail(502, 'Não foi possível iniciar a sessão.');
  res.setHeader('Set-Cookie', [
    'vitrine_at=' + encodeURIComponent(access) + '; Max-Age=' + Math.min(3600, Number(data.expires_in) || 3600) + flags,
    'vitrine_rt=' + encodeURIComponent(refresh) + '; Max-Age=2592000' + flags
  ]);
}
function clearSession(res) {
  const flags = '; HttpOnly; SameSite=Lax; Path=/' + (IS_PROD ? '; Secure' : '');
  res.setHeader('Set-Cookie', ['vitrine_at=; Max-Age=0' + flags, 'vitrine_rt=; Max-Age=0' + flags]);
}
async function signIn(email, password) {
  return call('/auth/v1/token?grant_type=password', 'POST', { email, password });
}
async function getUser(req, res) {
  const c = cookies(req);
  let access = c.vitrine_at ? decodeURIComponent(c.vitrine_at) : '';
  if (access) {
    const user = await call('/auth/v1/user', 'GET', undefined, { userToken: access, allowUnauthorized: true });
    if (user?.id) return user;
  }
  if (!c.vitrine_rt) fail(401, 'Entre na sua conta para continuar.');
  const session = await call('/auth/v1/token?grant_type=refresh_token', 'POST', { refresh_token: decodeURIComponent(c.vitrine_rt) }, { allowUnauthorized: true });
  if (!session?.access_token) { clearSession(res); fail(401, 'Sessão expirada. Faça login novamente.'); }
  setSession(res, session);
  const user = await call('/auth/v1/user', 'GET', undefined, { userToken: session.access_token });
  if (!user?.id) fail(401, 'Sessão inválida.');
  return user;
}
function isAdmin(user) { return Boolean(ADMIN && String(user.email || '').toLowerCase() === ADMIN); }
async function isTester(user) {
  const rows = await select('beta_testers', {
    user_id: 'eq.' + user.id,
    enabled: 'eq.true',
    select: 'user_id',
    limit: '1'
  });
  return rows.length > 0;
}
async function ownBusiness(user, create = true) {
  const existing = await select('businesses', { owner_id: 'eq.' + user.id, select: '*', limit: '1' });
  if (existing[0]) return existing[0];
  if (!create) fail(404, 'Negócio não cadastrado.');
  return insert('businesses', { owner_id: user.id, name: 'Minha vitrine', slug: slugify('minha-vitrine') });
}
async function ownItems(business) {
  return select('catalog_items', { business_id: 'eq.' + business.id, select: '*', order: 'position.asc,created_at.asc' });
}
function trimItem(input, partial = false) {
  const item = {};
  if (!partial || input.name !== undefined) item.name = nameValue(input.name);
  if (!partial || input.category !== undefined) item.category = maxText(input.category || 'Geral', 80) || 'Geral';
  if (!partial || input.description !== undefined) item.description = maxText(input.description, 1500);
  if (!partial || input.price_cents !== undefined) {
    const price = Number(input.price_cents);
    if (!Number.isInteger(price) || price < 0 || price > 100000000) fail(400, 'Preço inválido.');
    item.price_cents = price;
  }
  if (!partial || input.image_path !== undefined) {
    const image = String(input.image_path || '');
    if (image && (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(image) || !image.startsWith(input.ownerId + '/'))) fail(400, 'Imagem não pertence à conta.');
    item.image_path = image || null;
  }
  return item;
}
function originGuard(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
  const host = String(req.headers.host || '');
  const origin = req.headers.origin;
  if (origin) {
    let parsed;
    try { parsed = new URL(String(origin)); } catch { fail(403, 'Origem inválida.'); }
    if (parsed.host !== host) fail(403, 'Origem não autorizada.');
  } else if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Origem não autorizada.');
}
function imageUrl(path) {
  return path ? SB + '/storage/v1/object/public/vitrine-media/' + String(path).split('/').map(encodeURIComponent).join('/') : '';
}
function publicBusiness(value) {
  return {
    id: value.id, name: value.name, slug: value.slug,
    description: value.description || '', whatsapp: value.whatsapp || '',
    is_published: !!value.is_published, logo_url: imageUrl(value.logo_path), logo_path: value.logo_path
  };
}
function publicItem(item) { return { id: item.id, name: item.name, category: item.category, description: item.description || '', price_cents: item.price_cents, image_path: item.image_path, image_url: imageUrl(item.image_path) }; }
async function api(req, res, pathname) {
  originGuard(req);
  if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { status: 'ok', ready: Boolean(SB && SECRET), version: 'beta-0.1' });
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    rateLimit(req, 'login');
    const body = await readJSON(req);
    const email = cleanEmail(body.email);
    if (!body.password) fail(400, 'Informe a senha.');
    const data = await signIn(email, String(body.password));
    setSession(res, data);
    return json(res, 200, { success: true });
  }
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    clearSession(res);
    return json(res, 200, { success: true });
  }
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    rateLimit(req, 'register', 8);
    const body = await readJSON(req);
    const email = cleanEmail(body.email);
    const password = String(body.password || '');
    if (password.length < 10 || password.length > 128) fail(400, 'A senha deve ter entre 10 e 128 caracteres.');
    const businessName = nameValue(body.businessName);
    const token = String(body.invite || '');
    if (!/^[a-zA-Z0-9_-]{30,100}$/.test(token)) fail(403, 'Convite inválido.');
    const hash = createHash('sha256').update(token).digest('hex');
    const rows = await select('beta_invites', { token_hash: 'eq.' + hash, email: 'eq.' + email, used_at: 'is.null', expires_at: 'gt.' + new Date().toISOString(), select: 'id,email', limit: '1' });
    if (!rows[0]) fail(403, 'Convite inexistente, usado ou expirado.');
    const usedAt = new Date().toISOString();
    const claimed = await patch('beta_invites', { id: 'eq.' + rows[0].id, used_at: 'is.null' }, { used_at: usedAt });
    if (!claimed.length) fail(409, 'Convite já utilizado.');
    let created = null;
    try {
      const result = await call('/auth/v1/admin/users', 'POST', { email, password, email_confirm: true });
      created = result?.user || result;
      if (!created?.id) fail(502, 'Não foi possível criar o usuário.');
    } catch (err) {
      await patch('beta_invites', { id: 'eq.' + rows[0].id, used_at: 'eq.' + usedAt }, { used_at: null }).catch(() => {});
      throw err;
    }
    try { await insert('businesses', { owner_id: created.id, name: businessName, slug: slugify(businessName) }); }
    catch (err) { console.error('Business creation pending for user:', created.id); }
    const session = await signIn(email, password);
    setSession(res, session);
    return json(res, 201, { success: true });
  }
  const publicMatch = /^\/api\/public\/([a-z0-9-]{3,80})$/.exec(pathname);
  if (publicMatch && req.method === 'GET') {
    const rows = await select('businesses', { slug: 'eq.' + publicMatch[1], is_published: 'eq.true', select: '*', limit: '1' });
    if (!rows[0]) fail(404, 'Vitrine indisponível.');
    const list = await select('catalog_items', { business_id: 'eq.' + rows[0].id, is_active: 'eq.true', select: '*', order: 'position.asc,created_at.asc' });
    return json(res, 200, { business: publicBusiness(rows[0]), items: list.map(publicItem) });
  }
  const user = await getUser(req, res);
  if (pathname === '/api/me' && req.method === 'GET') {
    const business = await ownBusiness(user);
    return json(res, 200, { user: { id: user.id, email: user.email, isAdmin: isAdmin(user), isTester: await isTester(user) }, business: publicBusiness(business), items: (await ownItems(business)).map(publicItem) });
  }
  if (pathname === '/api/business' && req.method === 'PUT') {
    const business = await ownBusiness(user);
    const body = await readJSON(req);
    const value = { name: nameValue(body.name), description: maxText(body.description, 500), whatsapp: String(body.whatsapp || '').replace(/\D/g, '').slice(0, 15), updated_at: new Date().toISOString() };
    if (body.logo_path !== undefined) {
      const path = String(body.logo_path || '');
      if (path && !path.startsWith(user.id + '/')) fail(403, 'Imagem de outra conta.');
      value.logo_path = path || null;
    }
    const result = await patch('businesses', { id: 'eq.' + business.id, owner_id: 'eq.' + user.id }, value);
    return json(res, 200, { business: publicBusiness(result[0] || business) });
  }
  if (pathname === '/api/publish' && req.method === 'POST') {
    const business = await ownBusiness(user);
    const body = await readJSON(req);
    const publish = body.publish === true;
    if (publish && !(await ownItems(business)).length) fail(400, 'Adicione pelo menos um serviço antes de publicar.');
    const updated = await patch('businesses', { id: 'eq.' + business.id, owner_id: 'eq.' + user.id }, { is_published: publish, updated_at: new Date().toISOString() });
    return json(res, 200, { business: publicBusiness(updated[0] || business) });
  }
  if (pathname === '/api/items' && req.method === 'POST') {
    const business = await ownBusiness(user);
    const body = await readJSON(req);
    const current = await ownItems(business);
    if (current.length >= 200) fail(409, 'Limite de 200 itens por vitrine no beta.');
    const item = trimItem({ ...body, ownerId: user.id });
    item.business_id = business.id;
    item.position = current.length + 1;
    const created = await insert('catalog_items', item);
    return json(res, 201, { item: publicItem(created) });
  }
  const itemMatch = /^\/api\/items\/([a-f0-9-]{36})$/.exec(pathname);
  if (itemMatch && (req.method === 'PATCH' || req.method === 'DELETE')) {
    const business = await ownBusiness(user);
    const existing = await select('catalog_items', { id: 'eq.' + itemMatch[1], business_id: 'eq.' + business.id, select: '*', limit: '1' });
    if (!existing[0]) fail(404, 'Item não encontrado.');
    const body = await readJSON(req);
    if (req.method === 'DELETE') {
      if (body.confirm !== true) fail(409, 'Confirme a exclusão.');
      await remove('catalog_items', { id: 'eq.' + itemMatch[1], business_id: 'eq.' + business.id });
      return json(res, 200, { success: true });
    }
    const changes = trimItem({ ...body, ownerId: user.id }, true);
    if (changes.price_cents !== undefined && changes.price_cents !== existing[0].price_cents && body.confirmPrice !== true) fail(409, 'Confirme a alteração de preço.');
    const saved = await patch('catalog_items', { id: 'eq.' + itemMatch[1], business_id: 'eq.' + business.id }, changes);
    return json(res, 200, { item: publicItem(saved[0] || existing[0]) });
  }
  if (pathname === '/api/upload' && req.method === 'POST') {
    rateLimit(req, 'upload', 40);
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim();
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
    if (!ext) fail(415, 'Envie somente JPG, PNG ou WebP.');
    const data = await readBody(req, MAX_IMAGE);
    if (!data.length || (mime === 'image/jpeg' && data.subarray(0, 3).toString('hex') !== 'ffd8ff') || (mime === 'image/png' && data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') || (mime === 'image/webp' && (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP'))) fail(415, 'O arquivo não é uma imagem válida.');
    const path = user.id + '/' + randomUUID() + '.' + ext;
    const result = await fetch(SB + '/storage/v1/object/vitrine-media/' + path, { method: 'POST', headers: { apikey: SECRET, Authorization: 'Bearer ' + SECRET, 'Content-Type': mime, 'x-upsert': 'false' }, body: data, signal: AbortSignal.timeout(20000) });
    if (!result.ok) { console.error('Upload error', result.status); fail(502, 'Falha ao enviar imagem.'); }
    return json(res, 201, { path, url: imageUrl(path) });
  }
  // A point-in-time founder check, not uptime monitoring or the Render control-plane API.
  // No secrets or exception details are returned to the browser.
  if (pathname === '/api/admin/system' && req.method === 'GET') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const [databaseCheck, authCheck, storageCheck] = await Promise.allSettled([
      (async () => {
        const [businesses, invites] = await Promise.all([
          select('businesses', { select: 'name,created_at', order: 'created_at.desc', limit: '1' }),
          select('beta_invites', { select: 'email,created_at', order: 'created_at.desc', limit: '1' })
        ]);
        return {
          recentBusiness: businesses[0] ? { name: businesses[0].name, createdAt: businesses[0].created_at } : null,
          recentInvite: invites[0] ? { email: invites[0].email, createdAt: invites[0].created_at } : null
        };
      })(),
      (async () => {
        const data = await call('/auth/v1/admin/users?page=1&per_page=1');
        if (!Array.isArray(data?.users)) throw Error('Resposta Auth inesperada');
        return true;
      })(),
      (async () => {
        const data = await call('/storage/v1/bucket/vitrine-media');
        if (data?.id !== 'vitrine-media' && data?.name !== 'vitrine-media') throw Error('Bucket não encontrado');
        return true;
      })()
    ]);
    for (const [name, result] of [
      ['dados', databaseCheck], ['autenticação', authCheck], ['armazenamento', storageCheck]
    ]) {
      if (result.status === 'rejected') console.error('Admin system check failed:', name, String(result.reason?.message || 'Falha na consulta'));
    }
    const databaseHealthy = databaseCheck.status === 'fulfilled';
    return json(res, 200, {
      checkedAt: new Date().toISOString(),
      environment: IS_PROD ? 'production' : 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        app: { healthy: true, detail: 'Este servidor respondeu à consulta.' },
        database: { healthy: databaseHealthy, detail: databaseHealthy ? 'Consulta de leitura realizada.' : 'Não foi possível consultar os dados.' },
        auth: { healthy: authCheck.status === 'fulfilled', detail: authCheck.status === 'fulfilled' ? 'Serviço de autenticação respondeu.' : 'Não foi possível confirmar a autenticação.' },
        storage: { healthy: storageCheck.status === 'fulfilled', detail: storageCheck.status === 'fulfilled' ? 'Bucket de mídia respondeu.' : 'Não foi possível confirmar o armazenamento.' }
      },
      recent: {
        business: databaseHealthy ? databaseCheck.value.recentBusiness : null,
        invite: databaseHealthy ? databaseCheck.value.recentInvite : null,
        adminLoginAt: user.last_sign_in_at || null,
        dataAvailable: databaseHealthy
      }
    });
  }
  if (pathname === '/api/admin/summary' && req.method === 'GET') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const now = new Date();
    const [businesses, published, drafts, pendingInvites, activeTesters] = await Promise.all([
      countRows('businesses'),
      countRows('businesses', { is_published: 'eq.true' }),
      countRows('businesses', { is_published: 'eq.false' }),
      countRows('beta_invites', { used_at: 'is.null', expires_at: 'gt.' + now.toISOString() }),
      countRows('beta_testers', { enabled: 'eq.true' })
    ]);
    return json(res, 200, {
      counts: { businesses, published, drafts, pendingInvites, activeTesters },
      asOf: now.toISOString()
    });
  }
  if (pathname === '/api/admin/businesses' && req.method === 'GET') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const [rows, testers, authResult] = await Promise.all([
      select('businesses', {
        select: 'id,owner_id,name,slug,description,whatsapp,is_published,created_at,updated_at',
        order: 'created_at.desc',
        limit: '101'
      }),
      select('beta_testers', { select: 'user_id,enabled', limit: '1000' }),
      call('/auth/v1/admin/users?page=1&per_page=200')
    ]);
    const accounts = new Map();
    const firstPage = Array.isArray(authResult?.users) ? authResult.users : [];
    for (const account of firstPage) {
      if (account?.id) accounts.set(account.id, account.email || null);
    }
    // The beta is limited to 100 businesses in this view. Fetch more Auth pages
    // only if the current page did not cover all listed owners.
    const selected = rows.slice(0, 100);
    const ownerIds = new Set(selected.map(b => b.owner_id));
    for (let page = 2; page <= 5 && [...ownerIds].some(id => !accounts.has(id)); page++) {
      if (firstPage.length < 200 && page === 2) break;
      const nextPage = await call('/auth/v1/admin/users?page=' + page + '&per_page=200');
      const batch = Array.isArray(nextPage?.users) ? nextPage.users : [];
      for (const account of batch) if (account?.id) accounts.set(account.id, account.email || null);
      if (batch.length < 200) break;
    }
    const testerIds = new Set(testers.filter(t => t.enabled).map(t => t.user_id));
    const businesses = selected.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description || '',
      whatsapp: b.whatsapp || '',
      ownerEmail: accounts.get(b.owner_id) || null,
      isTester: testerIds.has(b.owner_id),
      isPublished: !!b.is_published,
      createdAt: b.created_at,
      updatedAt: b.updated_at
    }));
    return json(res, 200, { businesses, hasMore: rows.length > 100, asOf: new Date().toISOString() });
  }
  const adminUnpublish = /^\/api\/admin\/businesses\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/unpublish$/.exec(pathname);
  if (adminUnpublish && req.method === 'POST') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const body = await readJSON(req);
    if (body.confirm !== true) fail(409, 'Confirme a retirada da vitrine do ar.');
    const current = await select('businesses', { id: 'eq.' + adminUnpublish[1], select: 'id,name,is_published', limit: '1' });
    if (!current[0]) fail(404, 'Negócio não encontrado.');
    if (!current[0].is_published) return json(res, 200, { success: true, alreadyDraft: true });
    const updated = await patch('businesses', { id: 'eq.' + adminUnpublish[1], is_published: 'eq.true' }, {
      is_published: false,
      updated_at: new Date().toISOString()
    });
    if (!updated.length) fail(409, 'O estado da vitrine mudou. Atualize a lista.');
    return json(res, 200, { success: true });
  }
  // Testers are a pilot classification, not an authorization or login role.
  // Management endpoints are restricted to the founder/admin on the server.
  if (pathname === '/api/admin/testers' && req.method === 'GET') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const [rows, businesses] = await Promise.all([
      select('beta_testers', { select: 'user_id,email,enabled,notes,created_at', order: 'created_at.desc', limit: '101' }),
      select('businesses', { select: 'owner_id,name,slug,is_published', limit: '500' })
    ]);
    const businessByOwner = new Map(businesses.map(b => [b.owner_id, b]));
    const testers = rows.slice(0,100).map(t => {
      const business = businessByOwner.get(t.user_id);
      return {
        userId: t.user_id,
        email: t.email,
        enabled: !!t.enabled,
        notes: t.notes || '',
        createdAt: t.created_at,
        businessName: business?.name || null,
        businessSlug: business?.slug || null,
        businessPublished: business?.is_published || false
      };
    });
    return json(res, 200, { testers, hasMore: rows.length > 100, asOf: new Date().toISOString() });
  }
  if (pathname === '/api/admin/testers' && req.method === 'POST') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    rateLimit(req, 'tester', 25);
    const body = await readJSON(req);
    const email = cleanEmail(body.email);
    const notes = maxText(body.notes || '', 280);
    const current = await select('beta_testers', { email: 'eq.' + email, select: 'user_id', limit: '1' });
    if (current.length) fail(409, 'Este email já está cadastrado como tester.');
    let account = null;
    // Supabase Auth Admin list endpoint. This search is bounded for the small beta.
    // Do not guess an auth.users ID from a client-supplied email.
    for (let page = 1; page <= 10; page++) {
      const result = await call('/auth/v1/admin/users?page=' + page + '&per_page=200');
      const users = Array.isArray(result?.users) ? result.users : [];
      account = users.find(u => String(u?.email || '').toLowerCase() === email) || null;
      if (account || users.length < 200) break;
    }
    if (!account?.id) fail(404, 'Conta não encontrada. Convide a pessoa primeiro.');
    const inserted = await insert('beta_testers', { user_id: account.id, email, enabled: true, notes });
    return json(res, 201, { success: true, userId: inserted?.user_id });
  }
  const testerMatch = /^\/api\/admin\/testers\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(pathname);
  if (testerMatch && req.method === 'PATCH') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const body = await readJSON(req);
    const changes = {};
    if (typeof body.enabled === 'boolean') {
      if (body.enabled === false && body.confirm !== true) fail(409, 'Confirme a desativação do tester.');
      changes.enabled = body.enabled;
    }
    if (body.notes !== undefined) changes.notes = maxText(body.notes, 280);
    if (!Object.keys(changes).length) fail(400, 'Nenhuma alteração informada.');
    const existing = await select('beta_testers', { user_id: 'eq.' + testerMatch[1], select: 'user_id,enabled', limit: '1' });
    if (!existing[0]) fail(404, 'Tester não encontrado.');
    const updated = await patch('beta_testers', { user_id: 'eq.' + testerMatch[1] }, changes);
    if (!updated.length) fail(409, 'Não foi possível atualizar o tester.');
    return json(res, 200, { success: true, enabled: updated[0].enabled });
  }
  if (pathname === '/api/admin/invites' && req.method === 'GET') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const rows = await select('beta_invites', { select: 'id,email,created_at,expires_at,used_at', order: 'created_at.desc', limit: '101' });
    return json(res, 200, { invites: rows.slice(0,100), hasMore: rows.length > 100, asOf: new Date().toISOString() });
  }
  if (pathname === '/api/admin/invites' && req.method === 'POST') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    rateLimit(req, 'invite', 30);
    const body = await readJSON(req);
    const email = cleanEmail(body.email);
    const token = randomBytes(32).toString('base64url');
    const token_hash = createHash('sha256').update(token).digest('hex');
    const expires_at = new Date(Date.now() + 14 * 86400000).toISOString();
    await insert('beta_invites', { email, token_hash, expires_at });
    return json(res, 201, { token, email, expires_at, path: '/?invite=' + encodeURIComponent(token) });
  }
  const cancelInvite = /^\/api\/admin\/invites\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/cancel$/.exec(pathname);
  if (cancelInvite && req.method === 'POST') {
    if (!isAdmin(user)) fail(403, 'Área restrita ao administrador.');
    const body = await readJSON(req);
    if (body.confirm !== true) fail(409, 'Confirme o cancelamento do convite.');
    const now = new Date().toISOString();
    // Use a fixed expiration sentinel so the cancelled state is visible without
    // changing the existing database schema. Registration already checks expiry.
    const revoked = await patch('beta_invites', {
      id: 'eq.' + cancelInvite[1],
      used_at: 'is.null',
      expires_at: 'gt.' + now
    }, { expires_at: '2000-01-01T00:00:00.000Z' });
    if (!revoked.length) fail(409, 'Convite não está mais pendente. Atualize a lista.');
    return json(res, 200, { success: true });
  }
  fail(404, 'Rota não encontrada.');
}
const staticFiles = new Map([
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]
]);
async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; connect-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'");
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = url.pathname;
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'Método não permitido.');
    const file = staticFiles.get(pathname);
    if (file || pathname === '/' || pathname === '/index.html' || /^\/v\/[a-z0-9-]{3,80}$/.test(pathname)) {
      const [filename, type] = file || ['index.html', 'text/html; charset=utf-8'];
      const bytes = await readFile(join(import.meta.dirname, 'public', filename));
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : bytes);
    }
    fail(404, 'Página não encontrada.');
  } catch (error) {
    if (!(error instanceof HttpError)) console.error('Vitrine server error:', error);
    const status = error instanceof HttpError ? error.status : 500;
    return json(res, status, { error: error instanceof HttpError ? error.message : 'Falha interna no serviço.' });
  }
}
createServer(handler).listen(PORT, '0.0.0.0', () => console.log('Vitrine Beta listening on', PORT));
