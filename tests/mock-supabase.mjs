// Local, deterministic Supabase emulator for API integration tests.
// Never contacts a real project and never uses production secrets.
const originalFetch = globalThis.fetch;
const ownerId = '22222222-2222-4222-8222-222222222222';
const businessId = '11111111-1111-4111-8111-111111111111';
const now = new Date().toISOString();
const state = {
  businesses: [{ id: businessId, owner_id: ownerId, name: 'Barbearia Exemplo', slug: 'barbearia-exemplo-123',
    description: '', whatsapp: '', is_published: true, created_at: now, updated_at: now }],
  beta_testers: [{ user_id: ownerId, email: 'admin@example.test', enabled: true, notes: 'Teste interno', created_at: now }],
  beta_invites: [{ id:'33333333-3333-4333-8333-333333333333', email:'guest@example.test',
    created_at: now, expires_at: new Date(Date.now() + 86400000).toISOString(), used_at:null }]
};
const authUsers = [{ id: ownerId, email: 'admin@example.test', last_sign_in_at: now }];
function reply(status, payload, headers={}) {
  return new Response(JSON.stringify(payload), { status, headers: {'content-type':'application/json',...headers} });
}
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  if (u.hostname !== 'mock.supabase.invalid') return originalFetch(url, opts);
  const bearer = opts.headers?.Authorization || opts.headers?.authorization || '';
  if (u.pathname === '/auth/v1/user') {
    if (bearer === 'Bearer admin-access') return reply(200, authUsers[0]);
    if (bearer === 'Bearer member-access') return reply(200, { id: '44444444-4444-4444-8444-444444444444', email: 'member@example.test' });
    return reply(401, {message:'Invalid JWT'});
  }
  if (u.pathname === '/auth/v1/admin/users') {
    if (bearer !== 'Bearer test-service-key') return reply(403, {message:'Forbidden'});
    return reply(200, {users:authUsers});
  }
  if (u.pathname === '/storage/v1/bucket/vitrine-media') {
    return reply(200, {id:'vitrine-media',name:'vitrine-media',public:true});
  }
  const table = /^\/rest\/v1\/([a-z_]+)$/.exec(u.pathname)?.[1];
  if (table && state[table]) {
    const allowedColumns = table === 'beta_testers' ? ['user_id','email','enabled','notes','created_at'] :
      table === 'businesses' ? ['id','name','slug','owner_id','description','whatsapp','is_published','created_at','updated_at'] :
      ['id','email','expires_at','used_at','created_at'];
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
    if (opts.method === 'PATCH') {
      const changes = JSON.parse(opts.body || '{}');
      rows.forEach(row => Object.assign(row, changes));
      return reply(200, rows);
    }
    const count = opts.headers?.Prefer === 'count=exact';
    return reply(200, rows, count ? {'content-range': total ? '0-0/' + total : '*/0'} : {});
  }
  return reply(404, {message:'Mock endpoint not found'});
};
