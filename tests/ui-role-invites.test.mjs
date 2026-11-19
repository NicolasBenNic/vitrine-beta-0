import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,runInContext} from 'node:vm';
const code=await readFile(new URL('../public/app.js',import.meta.url),'utf8');

function renderSession({query='?invite=abcdefghijklmnopqrstuvwx1234567890',admin=false,founder=false,tester=false,tab='home'}={}){
  const app={innerHTML:'',addEventListener(){}};
  const toast={textContent:'',style:{},classList:{add(){},remove(){}}};
  const ctx=createContext({
    document:{getElementById(id){return id==='app'?app:id==='toast'?toast:null;}},
    location:{search:query,pathname:'/',origin:'https://vitrine.example.test'},
    URLSearchParams,Date,console,Intl,setTimeout,clearTimeout,
    history:{replaceState(){}}
  });
  runInContext(code,ctx,{timeout:2000});
  if(tab==='auth')return app.innerHTML;
  const values={
    user:{id:'44444444-4444-4444-8444-444444444444',email:'pessoa@example.test',
      isAdmin:admin,isFounder:founder,isTester:tester},
    business:{id:'66666666-6666-4666-8666-666666666666',name:'Empresa Exemplo',slug:'empresa-exemplo',is_published:false},
    items:[],tab
  };
  runInContext('Object.assign(state,'+JSON.stringify(values)+');renderApp();',ctx,{timeout:2000});
  return app.innerHTML;
}

test('convites de tester mostram acesso à própria vitrine, não ADM',()=>{
  const html=renderSession({query:'?invite=abc&tester=1',tab:'auth'});
  assert.match(html,/Convite para tester/);
  assert.match(html,/própria vitrine/);
  assert.match(html,/Nome do negócio/);
  assert.doesNotMatch(html,/Ativar minha Central ADM/);
});
test('convites ADM mostram ativação administrativa, não exigem negócio',()=>{
  const html=renderSession({query:'?invite=abc&partner=1',tab:'auth'});
  assert.match(html,/Ativar acesso ADM/);
  assert.doesNotMatch(html,/Nome do negócio/);
});
test('Resumo ADM do fundador cria só convites de administrador',()=>{
  const html=renderSession({admin:true,founder:true,tab:'admin-summary'});
  assert.match(html,/id="admin-invite-form"/);
  assert.match(html,/Gerar convite ADM/);
  assert.doesNotMatch(html,/id="tester-invite-form"/);
});
test('Área Testers cria só convites tester, sem opção de ADM',()=>{
  const html=renderSession({admin:true,founder:true,tab:'admin-testers'});
  assert.match(html,/id="tester-invite-form"/);
  assert.match(html,/Gerar convite tester/);
  assert.doesNotMatch(html,/id="admin-invite-form"/);
});
test('Coadmin usa ADM mas não pode conceder convites ADM',()=>{
  const summary=renderSession({admin:true,founder:false,tab:'admin-summary'});
  assert.match(summary,/Resumo ADM/);
  assert.doesNotMatch(summary,/id="admin-invite-form"/);
  const testers=renderSession({admin:true,founder:false,tab:'admin-testers'});
  assert.match(testers,/id="tester-invite-form"/);
});
test('Tester não vê navegação ADM e não abre o resumo',()=>{
  const html=renderSession({admin:false,tester:true,tab:'admin-summary'});
  assert.match(html,/Minha vitrine/);
  assert.match(html,/Acesso restrito ao administrador/);
  assert.doesNotMatch(html,/data-tab="admin-summary"/);
  assert.doesNotMatch(html,/data-tab="admin-testers"/);
  assert.doesNotMatch(html,/id="admin-invite-form"/);
  assert.doesNotMatch(html,/id="tester-invite-form"/);
});
