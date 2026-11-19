import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

test('isolamento multiempresa: tester só administra a própria vitrine, não acessa Central ADM',async()=>{
  const port=38000+Math.floor(Math.random()*5000);
  const proc=spawn(process.execPath,['--import','./tests/mock-supabase.mjs','server.mjs'],{
    cwd:process.cwd(),
    env:{...process.env,PORT:String(port),NODE_ENV:'test',
      SUPABASE_URL:'https://mock.supabase.invalid',
      SUPABASE_SERVICE_ROLE_KEY:'test-service-key',
      VITRINE_ADMIN_EMAIL:'admin@example.test',TEST_MULTI_TENANT:'1'},
    stdio:'ignore'
  });
  const base='http://127.0.0.1:'+port;
  const tester={Cookie:'vitrine_at=member-access'};
  const other={Cookie:'vitrine_at=other-access'};
  const json=(method,path,body,headers=tester)=>fetch(base+path,{
    method,headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  try{
    let alive=false;
    for(let n=0;n<60;n++){await wait(100);try{if((await fetch(base+'/api/health')).ok){alive=true;break;}}catch{}}
    assert.ok(alive,'Servidor mock não iniciou');
    const self=await fetch(base+'/api/me',{headers:tester});
    assert.equal(self.status,200);
    const me=await self.json();
    assert.equal(me.user.isTester,true);
    assert.equal(me.user.isAdmin,false);
    assert.equal(me.business.name,'Empresa Tester');
    assert.equal(me.items.length,1);
    assert.equal(me.items[0].name,'Serviço do tester');
    assert.ok(!JSON.stringify(me).includes('Empresa de Outra Pessoa'));
    assert.ok(!JSON.stringify(me).includes('Serviço de outro'));

    const otherSelf=await fetch(base+'/api/me',{headers:other});
    assert.equal(otherSelf.status,200);
    const otherAccount=await otherSelf.json();
    assert.equal(otherAccount.business.name,'Empresa de Outra Pessoa');
    assert.equal(otherAccount.user.isAdmin,false);
    assert.equal(otherAccount.user.isTester,false);

    const protectedPaths=[
      '/api/admin/summary','/api/admin/businesses','/api/admin/testers',
      '/api/admin/invites','/api/admin/system','/api/admin/partners'
    ];
    for(const path of protectedPaths){
      assert.equal((await fetch(base+path,{headers:tester})).status,403,
        'Tester não pode acessar '+path);
      assert.equal((await fetch(base+path,{headers:other})).status,403,
        'Usuário comum não pode acessar '+path);
    }
    const otherItem='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    assert.equal((await json('PATCH','/api/items/'+otherItem,{name:'Item tomado'})).status,404,
      'Tester não altera item de outro negócio');
    assert.equal((await json('DELETE','/api/items/'+otherItem,{confirm:true})).status,404,
      'Tester não exclui item de outro negócio');

    const otherMediaPath='88888888-8888-4888-8888-888888888888/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg';
    assert.equal((await json('POST','/api/items',{
      name:'Foto roubada',category:'Geral',description:'',price_cents:500,image_path:otherMediaPath
    })).status,400,'Tester não pode associar mídia de outra conta');

    const edited=await json('PUT','/api/business',{
      name:'Empresa Tester Editada',description:'Do próprio negócio',whatsapp:'85999999999'
    });
    assert.equal(edited.status,200,'Tester pode editar sua empresa');

    const ownAfter=await fetch(base+'/api/me',{headers:tester});
    assert.equal((await ownAfter.json()).business.name,'Empresa Tester Editada');

    const outsiderAfter=await fetch(base+'/api/me',{headers:other});
    const outsider=(await outsiderAfter.json());
    assert.equal(outsider.business.name,'Empresa de Outra Pessoa',
      'Modificação do tester não altera dados de outra empresa');
    assert.equal(outsider.items[0].name,'Serviço de outro');
  }finally{proc.kill('SIGTERM');}
});
