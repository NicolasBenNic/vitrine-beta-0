import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';

test('convites separados: ADM pelo Resumo, tester pelo próprio negócio',async()=>{
  const port=40000+Math.floor(Math.random()*4000);
  const p=spawn(process.execPath,['--import','./tests/mock-supabase.mjs','server.mjs'],{
    cwd:process.cwd(),
    env:{...process.env,PORT:String(port),NODE_ENV:'test',SUPABASE_URL:'https://mock.supabase.invalid',
      SUPABASE_SERVICE_ROLE_KEY:'test-service-key',VITRINE_ADMIN_EMAIL:'admin@example.test'},
    stdio:'ignore'
  });
  const base='http://127.0.0.1:'+port;
  const founder={Cookie:'vitrine_at=admin-access'};
  const user={Cookie:'vitrine_at=member-access'};
  const post=(path,data,headers)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(headers||{})},body:JSON.stringify(data)});
  const get=(path,headers)=>fetch(base+path,{headers});
  try{
    let ready=false;
    for(let i=0;i<60;i++){await wait(100);try{if((await get('/api/health')).ok){ready=true;break;}}catch{}}
    assert.ok(ready,'Servidor não iniciou');

    // A tester account must not be able to generate privileged invitations.
    assert.equal((await post('/api/admin/invites',{email:'socio@example.test',role:'coadmin'},user)).status,403);
    assert.equal((await post('/api/admin/invites',{email:'socio@example.test',role:'tester'},user)).status,403);

    const adminInvitation=await post('/api/admin/invites',{email:'adm@example.test',role:'coadmin'},founder);
    assert.equal(adminInvitation.status,201);
    const adm=await adminInvitation.json();
    assert.equal(adm.role,'coadmin');
    assert.ok(adm.path.includes('partner=1'));
    const adminToken=new URL('https://local.test'+adm.path).searchParams.get('invite');

    const testerInvitation=await post('/api/admin/invites',{email:'socio@example.test',role:'tester'},founder);
    assert.equal(testerInvitation.status,201);
    const tester=await testerInvitation.json();
    assert.equal(tester.role,'tester');
    assert.ok(tester.path.includes('tester=1'));
    const testerToken=new URL('https://local.test'+tester.path).searchParams.get('invite');

    const a=await get('/api/admin/invites?role=coadmin',founder);
    const b=await get('/api/admin/invites?role=tester',founder);
    assert.equal(a.status,200);
    assert.equal(b.status,200);
    assert.ok((await a.json()).invites.every(i=>i.invite_role==='coadmin'));
    assert.ok((await b.json()).invites.every(i=>i.invite_role==='tester'));
    assert.equal((await get('/api/admin/invites?role=coadmin',user)).status,403);

    // Cross-purpose token reuse must never elevate roles.
    assert.equal((await post('/api/auth/partner-accept',{email:'socio@example.test',
      password:'secure-tester-password',invite:testerToken})).status,403);
    assert.equal((await post('/api/auth/register',{email:'adm@example.test',
      password:'secure-admin-password',businessName:'Não pode',invite:adminToken})).status,403);

    const testerSignup=await post('/api/auth/register',{
      email:'socio@example.test',password:'secure-tester-password',
      businessName:'Barbearia de Teste',invite:testerToken,role:'coadmin'
    });
    assert.equal(testerSignup.status,201,'Convite tester deve criar uma conta real e separada');
    assert.equal((await testerSignup.json()).role,'tester');

    const testerSession={Cookie:'vitrine_at=partner-access'};
    const me=await get('/api/me',testerSession);
    assert.equal(me.status,200);
    const account=await me.json();
    assert.equal(account.user.isAdmin,false,'O papel do corpo enviado não pode conceder ADM');
    assert.equal(account.user.isTester,true,'Tester deve ser marcado no banco');
    assert.equal(account.business.name,'Barbearia de Teste');
    assert.equal(account.items.length,0);

    assert.equal((await get('/api/admin/summary',testerSession)).status,403);
    assert.equal((await get('/api/admin/businesses',testerSession)).status,403);
    assert.equal((await get('/api/admin/testers',testerSession)).status,403);
    assert.equal((await get('/api/admin/invites?role=tester',testerSession)).status,403);

    const reused=await post('/api/auth/register',{
      email:'socio@example.test',password:'secure-tester-password',
      businessName:'Segunda Vitrine',invite:testerToken
    });
    assert.equal(reused.status,403,'O link de tester deve funcionar uma vez');

    const unknown=await post('/api/auth/register',{
      email:'unknown@example.test',password:'secure-unknown-password',
      businessName:'Sem convite',invite:adminToken
    });
    assert.equal(unknown.status,403,'Convite ADM não vira convite de tester');
  }finally{p.kill('SIGTERM');}
});
