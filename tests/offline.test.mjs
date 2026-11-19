import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';

test('servidor inicia sem pacotes npm e expõe SPA/health check', async () => {
  const port = 30000 + Math.floor(Math.random()*15000);
  const proc = spawn(process.execPath, ['server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', NODE_ENV:'development' },
    stdio: 'ignore'
  });
  try {
    let ok = false;
    for (let i=0;i<45;i++) {
      await wait(100);
      try {
        const res = await fetch('http://127.0.0.1:'+port+'/api/health');
        if(res.ok){const data=await res.json();assert.equal(data.status,'ok');assert.equal(data.ready,false);ok=true;break;}
      } catch {}
    }
    assert.ok(ok,'Servidor não iniciou');
    const page=await fetch('http://127.0.0.1:'+port+'/');
    assert.equal(page.status,200);
    assert.match(await page.text(),/Vitrine/);
    const js=await fetch('http://127.0.0.1:'+port+'/app.js');
    assert.equal(js.status,200);
    const publicPage=await fetch('http://127.0.0.1:'+port+'/v/exemplo-123');
    assert.equal(publicPage.status,200);
    const blocked=await fetch('http://127.0.0.1:'+port+'/private-file.txt');
    assert.equal(blocked.status,404);
    const css=await fetch('http://127.0.0.1:'+port+'/style.css');
    assert.equal(css.status,200);
    const stylesheet=await css.text();
    for(const font of ['DM+Sans','DM+Mono','Playfair+Display'])
      assert.ok(stylesheet.includes(font),'Fonte ausente: '+font);
    const guest=await fetch('http://127.0.0.1:'+port+'/api/me');
    assert.equal(guest.status,401);
    const guestAdmin=await fetch('http://127.0.0.1:'+port+'/api/admin/summary');
    assert.equal(guestAdmin.status,401, 'O resumo ADM não pode ser acessado sem login');
    const businessList=await fetch('http://127.0.0.1:'+port+'/api/admin/businesses');
    assert.equal(businessList.status,401,'Lista de negócios deve exigir autenticação');
    const businessUnpublish=await fetch('http://127.0.0.1:'+port+'/api/admin/businesses/11111111-1111-4111-8111-111111111111/unpublish',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({confirm:true})
    });
    assert.equal(businessUnpublish.status,401,'Moderação de negócios deve exigir autenticação');
    const invites=await fetch('http://127.0.0.1:'+port+'/api/admin/invites');
    assert.equal(invites.status,401,'Convites devem exigir login');
    const cancelInvite=await fetch('http://127.0.0.1:'+port+'/api/admin/invites/11111111-1111-4111-8111-111111111111/cancel',{
      method:'POST', headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true})
    });
    assert.equal(cancelInvite.status,401,'Cancelamento de convite deve exigir login');
    const testersList=await fetch('http://127.0.0.1:'+port+'/api/admin/testers');
    assert.equal(testersList.status,401,'Testers não podem ser listados sem login');
    const addTester=await fetch('http://127.0.0.1:'+port+'/api/admin/testers',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'pessoa@example.test',notes:'Teste'})
    });
    assert.equal(addTester.status,401,'Cadastro de tester exige autenticação');
    const toggleTester=await fetch('http://127.0.0.1:'+port+'/api/admin/testers/11111111-1111-4111-8111-111111111111',{
      method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({enabled:false,confirm:true})
    });
    assert.equal(toggleTester.status,401,'Gestão de testers exige autenticação');
    const systemHealth=await fetch('http://127.0.0.1:'+port+'/api/admin/system');
    assert.equal(systemHealth.status,401,'Diagnóstico do sistema exige sessão administrativa');
    const invalidInvite=await fetch('http://127.0.0.1:'+port+'/api/auth/register',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'test@example.com',password:'long-password-test',businessName:'Teste',invite:''})
    });
    assert.equal(invalidInvite.status,403);
  } finally { proc.kill('SIGTERM'); }
});
