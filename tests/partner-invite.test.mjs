import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

test('convite exclusivo de sócio: emissão founder-only, vínculo por email, uso único, permissão real e revogação', async () => {
  const port = 36000 + Math.floor(Math.random() * 10000);
  const proc = spawn(process.execPath, ['--import', './tests/mock-supabase.mjs', 'server.mjs'], {
    cwd: process.cwd(),
    env:{
      ...process.env, PORT:String(port), NODE_ENV:'test',
      SUPABASE_URL:'https://mock.supabase.invalid',
      SUPABASE_SERVICE_ROLE_KEY:'test-service-key',
      VITRINE_ADMIN_EMAIL:'admin@example.test'
    }, stdio:'ignore'
  });
  const url = 'http://127.0.0.1:' + port;
  const founder={Cookie:'vitrine_at=admin-access'};
  const user={Cookie:'vitrine_at=member-access'};
  const admin=(path,body,headers=founder)=>fetch(url+path,{method:'POST',
    headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    let alive=false;
    for(let i=0;i<60;i++){
      await wait(100);
      try{const h=await fetch(url+'/api/health');if(h.ok){alive=true;break;}}catch{}
    }
    assert.ok(alive,'Servidor não iniciou');

    // The founder is the only person who may issue elevated invitations.
    const notFounder = await admin('/api/admin/invites',{email:'socio@example.test',role:'coadmin'},user);
    assert.equal(notFounder.status,403);

    const invite = await admin('/api/admin/invites',{email:'socio@example.test',role:'coadmin'});
    assert.equal(invite.status,201);
    const issuance=await invite.json();
    assert.equal(issuance.role,'coadmin');
    assert.match(issuance.path,/partner=1/);
    const token=new URL('http://local.test'+issuance.path).searchParams.get('invite');
    assert.ok(token);

    // A privileged token must never be treated as a normal signup token.
    const escalation=await admin('/api/auth/register',{
      email:'socio@example.test',password:'secure-password-123',businessName:'Empresa',invite:token
    });
    assert.equal(escalation.status,403);

    // Email bound to the invitation.
    const wrongEmail=await admin('/api/auth/partner-accept',{
      email:'different@example.test',password:'secure-password-123',invite:token
    });
    assert.equal(wrongEmail.status,403);

    const issuedToPartner=await admin('/api/auth/partner-accept',{
      email:'socio@example.test',password:'secure-password-123',invite:token
    });
    assert.equal(issuedToPartner.status,201, 'Convite válido deve cadastrar o sócio');
    const confirmed=await issuedToPartner.json();
    assert.equal(confirmed.role,'coadmin');

    const secondTry=await admin('/api/auth/partner-accept',{
      email:'socio@example.test',password:'secure-password-123',invite:token
    });
    assert.equal(secondTry.status,403,'Token já utilizado não deve funcionar novamente');

    const partner={Cookie:'vitrine_at=partner-access'};
    const me=await fetch(url+'/api/me',{headers:partner});
    assert.equal(me.status,200);
    const account=(await me.json()).user;
    assert.equal(account.isAdmin,true);
    assert.equal(account.isFounder,false);

    const summary=await fetch(url+'/api/admin/summary',{headers:partner});
    assert.equal(summary.status,200,'Sócio pode abrir a Central ADM');
    const partnerCannotInvite=await admin('/api/admin/invites',{
      email:'newpartner@example.test',role:'coadmin'
    },partner);
    assert.equal(partnerCannotInvite.status,403,'Sócio não concede acesso administrativo');

    const partnerCanInviteBusiness=await admin('/api/admin/invites',{
      email:'client@example.test',role:'business'
    },partner);
    assert.equal(partnerCanInviteBusiness.status,201);

    const partnerList=await fetch(url+'/api/admin/partners',{headers:founder});
    assert.equal(partnerList.status,200);
    const partners=(await partnerList.json()).partners;
    const found=partners.find(p=>p.email==='socio@example.test');
    assert.ok(found?.id,'Fundador pode visualizar sócio');

    const partnerCannotList=await fetch(url+'/api/admin/partners',{headers:partner});
    assert.equal(partnerCannotList.status,403);

    const revokeWithoutConfirm=await admin('/api/admin/partners/'+found.id+'/revoke',{confirm:false});
    assert.equal(revokeWithoutConfirm.status,409);
    const revoke=await admin('/api/admin/partners/'+found.id+'/revoke',{confirm:true});
    assert.equal(revoke.status,200);

    const after=await fetch(url+'/api/admin/summary',{headers:partner});
    assert.equal(after.status,403,'Revogação retira privilégios sem excluir conta');
    const regular=await fetch(url+'/api/me',{headers:partner});
    assert.equal(regular.status,200);
    assert.equal((await regular.json()).user.isAdmin,false);

    // An existing user can use their own password and the special invitation.
    const forMember=await admin('/api/admin/invites',{email:'member@example.test',role:'coadmin'});
    assert.equal(forMember.status,201);
    const memberToken=new URL('http://local.test'+(await forMember.json()).path).searchParams.get('invite');
    const activateExisting=await admin('/api/auth/partner-accept',{
      email:'member@example.test',password:'member-password-123',invite:memberToken
    });
    assert.equal(activateExisting.status,201);
    const existingAccess=await fetch(url+'/api/admin/summary',{headers:user});
    assert.equal(existingAccess.status,200);
  } finally {
    proc.kill('SIGTERM');
  }
});
