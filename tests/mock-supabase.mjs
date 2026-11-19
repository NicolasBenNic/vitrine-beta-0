// Local, deterministic Supabase emulator for API integration tests.
// No production credentials and no network calls to any real Supabase project.
import { randomUUID } from 'node:crypto';
const originalFetch = globalThis.fetch;
const ownerId = '22222222-2222-4222-8222-222222222222';
const businessId = '11111111-1111-4111-8111-111111111111';
const partnerId = '55555555-5555-4555-8555-555555555555';
const memberId = '44444444-4444-4444-8444-444444444444';
const now = new Date().toISOString();
const state = {
  businesses: [{ id: businessId, owner_id: ownerId, name: 'Barbearia Exemplo', slug: 'barbearia-exemplo-123',
    description: '', whatsapp: '', is_published: true, created_at: now, updated_at: now }],
  beta_testers: [{ user_id: ownerId, email: 'admin@example.test', enabled: true, notes: 'Teste interno', created_at: now }],
  beta_invites: [{ id:'33333333-3333-4333-8333-333333333333', email:'guest@example.test',
    invite_role: 'business', token_hash:'test-original-hash', created_at: now,
    expires_at: new Date(Date.now() + 86400000).toISOString(), used_at:null }]
};
const authUsers = [
  { id: ownerId, email: 'admin@example.test', password:'owner-password-123', app_metadata:{provider:'email'}, created_at:now,last_sign_in_at:now },
  { id: memberId, email: 'member@example.test', password:'member-password-123', app_metadata:{provider:'email'}, created_at:now,last_sign_in_at:now }
];
function reply(status, payload, headers={}) {
  return new Response(JSON.stringify(payload), { status, headers: {'content-type':'application/json',...headers} });
}
const authHeader = (opts) => opts.headers?.Authorization || opts.headers?.authorization || '';
const resultUser = (user) => {
  const { password, ...safe } = user;
  return safe;
};
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  if (u.hostname !== 'mock.supabase.invalid') return originalFetch(url, opts);
  const bearer = authHeader(opts);
  const method = opts.method || 'GET';
  const body = opts.body ? JSON.parse(opts.body) : {};
  if (u.pathname === '/auth/v1/user') {
    const token = bearer.replace('Bearer ','');
    const email = token === 'admin-access' ? 'admin@example.test' :
      token === 'member-access' ? 'member@example.test' :
      token === 'partner-access' ? 'socio@example.test' : '';
    const account = authUsers.find(x => x.email === email);
    return account ? reply(200, resultUser(account)) : reply(401, {message:'Invalid JWT'});
  }
  if (u.pathname === '/auth/v1/token' && method === 'POST') {
    const account = authUsers.find(x => x.email === body.email && x.password === body.password);
    if (!account) return reply(400, {error_description:'Invalid login credentials'});
    const token = account.email === 'admin@example.test' ? 'admin-access' :
      account.email === 'member@example.test' ? 'member-access' : 'partner-access';
    return reply(200, {user:resultUser(account), access_token:token, refresh_token:'refresh-test',expires_in:3600});
  }
  if (u.pathname === '/auth/v1/admin/users') {
    if (bearer !== 'Bearer test-service-key') return reply(403, {message:'Forbidden'});
    if (method === 'GET') return reply(200, {users:authUsers.map(resultUser)});
    if (method === 'POST') {
      if (authUsers.some(x => x.email === body.email)) return reply(422, {message:'User already registered'});
      const account={id:partnerId,email:body.email,password:body.password,app_metadata:{provider:'email'},created_at:now,last_sign_in_at:null};
      authUsers.push(account);
      return reply(200, {user:resultUser(account)});
    }
  }
  const userMatch = /^\/auth\/v1\/admin\/users\/([0-9a-f-]{36})$/.exec(u.pathname);
  if (userMatch) {
    if (bearer !== 'Bearer test-service-key') return reply(403, {message:'Forbidden'});
    const index=authUsers.findIndex(x => x.id === userMatch[1]);
    if(index < 0)return reply(404,{message:'Not found'});
    if (method === 'GET')return reply(200,{user:resultUser(authUsers[index])});
    if (method === 'PUT') {
      authUsers[index].app_metadata = {...body.app_metadata};
      return reply(200,{user:resultUser(authUsers[index])});
    }
    if (method === 'DELETE') {
      authUsers.splice(index,1);
      return reply(200,{});
    }
  }
  if (u.pathname === '/storage/v1/bucket/vitrine-media') {
    return reply(200, {id:'vitrine-media',name:'vitrine-media',public:true});
  }
  const table = /^\/rest\/v1\/([a-z_]+)$/.exec(u.pathname)?.[1];
  if (table && state[table]) {
    const allowedColumns = table === 'beta_testers' ? ['user_id','email','enabled','notes','created_at'] :
      table === 'businesses' ? ['id','name','slug','owner_id','description','whatsapp','is_published','created_at','updated_at'] :
      ['id','email','token_hash','invite_role','expires_at','used_at','created_at'];
    const select = (u.searchParams.get('select') || '*').split(',');
    if (select.some(c => c !== '*' && !allowedColumns.includes(c))) return reply(400, {message:'Column unavailable'});
    let rows = state[table].filter(row => {
      for (const [key,value] of u.searchParams) {
        if (['select','limit','order'].includes(key)) continue;
        if (value === 'is.null' && row[key] !== null) return false;
        if (value.startsWith('eq.') && String(row[key]) !== value.slice(3)) return false;
        if (value.startsWith('gt.') && !(new Date(row[key]) > new Date(value.slice(3)))) return false;
      }
      return true;
    });
    const total = rows.length;
    const limit = Number(u.searchParams.get('limit') || rows.length);
    rows = rows.slice(0, limit);
    if (method === 'POST') {
      const inserted={id:randomUUID(),created_at:now,...body};
      state[table].push(inserted);
      return reply(201, [inserted]);
    }
    if (method === 'PATCH') {
      const changes = body;
      rows.forEach(row => Object.assign(row, changes));
      return reply(200, rows);
    }
    if (method === 'DELETE') {
      for(const row of rows){const i=state[table].indexOf(row);if(i>=0)state[table].splice(i,1);}
      return reply(200,rows);
    }
    if (u.searchParams.get('order')?.includes('.desc')) rows=[...rows].reverse();
    const count = opts.headers?.Prefer === 'count=exact';
    return reply(200, rows, count ? {'content-range': total ? '0-0/' + total : '*/0'} : {});
  }
  return reply(404, {message:'Mock endpoint not found'});
};
