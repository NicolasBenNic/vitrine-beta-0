import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';

test('API administrativa: contratos integrados com Supabase simulado e permissões', async () => {
  const port = 35000 + Math.floor(Math.random() * 10000);
  const server = spawn(process.execPath, ['--import', './tests/mock-supabase.mjs', 'server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env, PORT: String(port), NODE_ENV:'test',
      SUPABASE_URL: 'https://mock.supabase.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      VITRINE_ADMIN_EMAIL: 'admin@example.test'
    },
    stdio:'ignore'
  });
  const base = 'http://127.0.0.1:' + port;
  const admin = { headers: { Cookie: 'vitrine_at=admin-access' } };
  const member = { headers: { Cookie: 'vitrine_at=member-access' } };
  try {
    let started = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      await wait(100);
      try { const response = await fetch(base + '/api/health'); if (response.ok) { started = true; break; } } catch {}
    }
    assert.ok(started, 'Servidor não iniciou no teste integrado');

    const unauthorized = await fetch(base + '/api/admin/summary');
    assert.equal(unauthorized.status, 401);
    const forbidden = await fetch(base + '/api/admin/summary', member);
    assert.equal(forbidden.status, 403);

    const summary = await fetch(base + '/api/admin/summary', admin);
    assert.equal(summary.status, 200, 'Contagens precisam usar as colunas reais de cada tabela');
    const metrics = (await summary.json()).counts;
    assert.deepEqual(metrics, { businesses:1, published:1, drafts:0, pendingInvites:1, activeTesters:1 });

    const business = await fetch(base + '/api/admin/businesses', admin);
    assert.equal(business.status, 200);
    const businessData = await business.json();
    assert.equal(businessData.businesses[0].ownerEmail, 'admin@example.test');

    const testers = await fetch(base + '/api/admin/testers', admin);
    assert.equal(testers.status, 200);
    const testersData = await testers.json();
    assert.equal(testersData.testers[0].enabled, true);

    const invites = await fetch(base + '/api/admin/invites', admin);
    assert.equal(invites.status, 200);
    const inviteData = await invites.json();
    assert.equal(inviteData.invites.length, 1);

    const sys = await fetch(base + '/api/admin/system', admin);
    assert.equal(sys.status, 200);
    const system = await sys.json();
    assert.equal(system.services.database.healthy, true);
    assert.equal(system.services.auth.healthy, true);
    assert.equal(system.services.storage.healthy, true);
    assert.equal(system.recent.business.name, 'Barbearia Exemplo');

    const protectedAction = await fetch(base + '/api/admin/testers/22222222-2222-4222-8222-222222222222', {
      method:'PATCH', headers:{...admin.headers,'Content-Type':'application/json'},
      body:JSON.stringify({enabled:false})
    });
    assert.equal(protectedAction.status, 409, 'Desativação exige confirmação explícita');

    const unauthAction = await fetch(base + '/api/admin/testers/22222222-2222-4222-8222-222222222222', {
      method:'PATCH', headers:{...member.headers,'Content-Type':'application/json'},
      body:JSON.stringify({enabled:false,confirm:true})
    });
    assert.equal(unauthAction.status, 403, 'Um usuário comum não pode administrar testers');
  } finally {
    server.kill('SIGTERM');
  }
});
