import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { createServer } from 'node:net';
import sharp from 'sharp';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { TeamMemberRepository } from '../services/server/team-members.ts';
import { AgentProposalRepository } from '../services/server/agent-proposals.ts';
import { SeededWorkspaceRepository } from '../services/server/seeded-workspace.ts';
import { createOperatorSession, sessionCookie } from '../services/server/operator-session.ts';

// This harness never loads .env.local or contacts a financial provider.
const root=resolve('.data',`boundary-verification-${randomUUID()}`);
mkdirSync(root,{recursive:true});
const config=JSON.parse(readFileSync(resolve('.data/treasury-config.json'),'utf8'));
config.wallet.companyId='isolated-boundary-verification';
const configPath=resolve(root,'config.json');
writeFileSync(configPath,JSON.stringify(config));
const variables={SETTLBOX_BUSINESS_DATABASE:resolve(root,'business.sqlite'),SETTLBOX_SESSION_DATABASE:resolve(root,'sessions.sqlite'),SETTLBOX_TREASURY_CONFIG:configPath,SETTLBOX_UPLOAD_DIRECTORY:resolve(root,'uploads')};
Object.assign(process.env,variables);
const workspaceSeed=new SeededWorkspaceRepository(variables.SETTLBOX_BUSINESS_DATABASE);
try { workspaceSeed.seed(config.wallet.companyId,'entity-3',JSON.parse(readFileSync('public/demo-data-entity-3.json','utf8'))); }
finally {workspaceSeed.close();}
const listener=createServer();
await new Promise(done=>listener.listen(0,'127.0.0.1',done));
const port=listener.address().port;
await new Promise(done=>listener.close(done));
const base=`http://127.0.0.1:${port}`;
const token=randomBytes(32).toString('hex');
const env={...process.env,...variables,PORT:String(port),HOSTNAME:'127.0.0.1',NEXT_PUBLIC_ARC_ENVIRONMENT:'testnet',SETTLBOX_APP_ORIGIN:base,SETTLBOX_OPERATOR_TOKEN:token,CIRCLE_API_KEY:'',CIRCLE_ENTITY_SECRET:'',CIRCLE_USER_CONTROLLED_API_KEY:'',SETTLBOX_FINANCE_WORKER_TOKEN:''};
let child;
async function start() {
  child=spawn(process.execPath,[resolve('.next/standalone/server.js')],{cwd:resolve('.next/standalone'),env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  let logs='';child.stdout.on('data',value=>logs+=value);child.stderr.on('data',value=>logs+=value);
  for(let attempt=0;attempt<100;attempt++) {
    if(child.exitCode!==null) throw new Error(`Verification server exited: ${logs}`);
    try {await fetch(`${base}/login`);return;} catch {await new Promise(done=>setTimeout(done,200));}
  }
  throw new Error('Verification server did not start');
}
async function stop() {if(child && child.exitCode===null){const exited=new Promise(done=>child.once('exit',done));child.kill();await exited;}}
const cookies={};
const team=new TeamMemberRepository(variables.SETTLBOX_BUSINESS_DATABASE);
try {
  for(const role of ['ADMIN','REVIEWER','VIEWER']) {
    const account=privateKeyToAccount(generatePrivateKey());
    const invite=team.invite(config.wallet.companyId,{firstName:role,email:`${role.toLowerCase()}@example.invalid`,role});
    const challenge=team.challenge(config.wallet.companyId,account.address,base,invite.token);
    const member=team.consumeChallenge(config.wallet.companyId,challenge.id);
    const session=createOperatorSession({id:`member:${member.uuid}`,memberId:member.id,companyId:config.wallet.companyId,role});
    cookies[role]=sessionCookie(session.token,false).split(';')[0];
  }
} finally {team.close();}
async function request(path,{role='OWNER',method='GET',body,origin=base}={}) {
  return fetch(`${base}${path}`,{method,headers:{Cookie:cookies[role]||'',Origin:origin},body});
}
function imageForm(bytes,type='image/png') {const form=new FormData();form.set('file',new Blob([bytes],{type}),'receipt.png');return form;}
try {
  await start();
  const login=await fetch(`${base}/api/operator/session`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token})});
  assert.equal(login.status,200);cookies.OWNER=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/agent-worker')).status,200);
  for(const role of ['ADMIN','REVIEWER','VIEWER']) assert.equal((await request('/api/agent-worker',{role})).status,403);
  for(const role of ['OWNER','ADMIN']) assert.equal((await request('/api/agent-chat',{role})).status,200);
  assert.equal((await request('/api/agent-chat',{role:'UNAUTHENTICATED'})).status,401);
  for(const role of ['REVIEWER','VIEWER']) assert.ok([401,403].includes((await request('/api/agent-chat',{role,method:'POST',body:'{}'})).status));
  assert.equal((await request('/api/agent-chat',{method:'POST',body:'{}',origin:'https://untrusted.example'})).status,401);
  for(const path of ['/api/agent-actions','/api/mcp-connections']) {
    assert.equal((await request(path)).status,200);
    for(const role of ['ADMIN','REVIEWER','VIEWER','UNAUTHENTICATED']) assert.equal((await request(path,{role})).status,403);
    assert.equal((await request(path,{method:'POST',body:'{}',origin:'https://untrusted.example'})).status,403);
  }
  const proposals=new AgentProposalRepository(variables.SETTLBOX_BUSINESS_DATABASE);
  async function approveOperation(tool,args) {
    const proposal=proposals.prepare(config.wallet.companyId,'workspace-operator',randomUUID(),{tool,arguments:args});
    const response=await request('/api/agent-actions',{method:'POST',body:JSON.stringify({action:'confirm',id:proposal.id})});
    assert.equal(response.status,200);
    const saved=await response.json();assert.equal(saved.status,'completed',JSON.stringify(saved));
    const replay=await request('/api/agent-actions',{method:'POST',body:JSON.stringify({action:'confirm',id:proposal.id})});
    assert.deepEqual(await replay.json(),saved);
    assert.equal((await request('/api/agent-actions',{method:'POST',body:JSON.stringify({action:'confirm',id:proposal.id,arguments:{amount:'999'}})})).status,409);
    return saved.result;
  }
  try {
    await request('/api/seeded-workspace?entity=entity-3');
    const invoice=await approveOperation('business.create',{kind:'invoice',title:'Isolated chat invoice',counterparty:'Verification Client',recipient:config.wallet.address,amount:'0.001',dueDate:'2026-11-12',description:'No money is sent'});
    const view=await (await request('/api/seeded-workspace?entity=entity-3')).json();
    assert.equal(view.data.invoices.filter(row=>row.businessRecordId===invoice.id).length,1,'Chat draft must appear in the normal invoice list');
    const stale=proposals.prepare(config.wallet.companyId,'workspace-operator',randomUUID(),{tool:'business.cancel',arguments:{id:invoice.id},precondition:createHash('sha256').update(JSON.stringify(invoice)).digest('hex')});
    const edit=await request(`/api/business-records/${invoice.id}`,{method:'PATCH',body:JSON.stringify({action:'edit',data:{kind:'invoice',title:'Updated isolated chat invoice',counterparty:invoice.counterparty,recipient:invoice.recipient,amount:invoice.amount,dueDate:invoice.dueDate,description:'Changed after review'}})});
    assert.equal(edit.status,200);
    const staleResult=await (await request('/api/agent-actions',{method:'POST',body:JSON.stringify({action:'confirm',id:stale.id})})).json();
    assert.equal(staleResult.status,'uncertain');assert.match(staleResult.error,/changed after review/);
    const issued=await approveOperation('business.issue',{id:invoice.id});assert.equal(issued.status,'issued');assert.ok(issued.paymentLinkCode);
    await approveOperation('business.cancel',{id:invoice.id});
    const employee=await approveOperation('workspace.save',{resource:'employees',data:{name:'Isolated Contractor',walletAddress:'0x'+'1'.repeat(40),email:'contractor@example.invalid',employeeType:'contractor'}});
    const contract=await approveOperation('contract.create',{employeeId:employee.id,amount:'0.001',payday:15,payrollCycle:2,joiningDate:'2026-10-12',contractTerm:'CONTRACTOR',description:'Isolated verification'});
    const prepared=await approveOperation('contract.prepare',{id:contract.id,period:0});
    await approveOperation('contract.confirm',{invoiceId:prepared.uuid});
    await approveOperation('contract.status',{id:contract.id,action:'pause'});
    const expense=await approveOperation('expense.create',{employeeName:'Isolated Contractor',recipient:'0x'+'1'.repeat(40),description:'Verification expense',category:'Other',date:'2026-10-12',amountExact:'0.001',currency:'USDC',receiptUrl:null,receiptName:null});
    await approveOperation('expense.review',{id:expense.id,action:'approve',note:'Isolated review'});
    const payable=await approveOperation('expense.prepare',{id:expense.id});assert.equal(payable.kind,'reimbursement');assert.equal(payable.status,'draft');
    const schedule=await approveOperation('schedule.create',{frequency:'monthly',payment:{kind:'bill',title:'Isolated recurring bill',counterparty:'Verification Vendor',recipient:'0x'+'1'.repeat(40),amount:'0.001',dueDate:'2026-11-12',description:'Verification only'},endDate:null});
    await approveOperation('schedule.status',{id:schedule.id,status:'paused'});
    const normalScreen=await request('/api/seeded-workspace/action',{method:'POST',body:JSON.stringify({entity:'entity-3',field:'invoices',id:invoice.id,action:'refresh'})});
    assert.equal(normalScreen.status,200,'Normal invoice actions must resolve a chat-created canonical record');
  } finally {proposals.close();}
  const png=await sharp({create:{width:3,height:3,channels:3,background:'#ffffff'}}).png().toBuffer();
  for(const role of ['REVIEWER','VIEWER','UNAUTHENTICATED']) assert.equal((await request('/api/uploads',{role,method:'POST',body:imageForm(png)})).status,401);
  assert.equal((await request('/api/uploads',{method:'POST',body:imageForm(png),origin:'https://untrusted.example'})).status,401);
  for(const bytes of [png.subarray(0,30),Buffer.alloc(2*1024*1024+1)]) assert.equal((await request('/api/uploads',{method:'POST',body:imageForm(bytes)})).status,400);
  const uploaded=await request('/api/uploads',{method:'POST',body:imageForm(png)});assert.equal(uploaded.status,201);
  const receipt=await uploaded.json();
  assert.deepEqual(Buffer.from(await (await request(receipt.url)).arrayBuffer()),png);
  assert.equal((await request(receipt.url,{role:'UNAUTHENTICATED'})).status,401);
  assert.equal((await request('/api/uploads/00000000-0000-0000-0000-000000000000.png')).status,404);
  await stop();await start();
  assert.deepEqual(Buffer.from(await (await request(receipt.url)).arrayBuffer()),png);
  writeFileSync(configPath,JSON.stringify({...config,wallet:{...config.wallet,companyId:'another-isolated-company'}}));
  assert.equal((await request(receipt.url)).status,404);
  writeFileSync(configPath,JSON.stringify(config));
  console.log('PASS: production HTTP roles, finance chat authorization and confirmed invoice/contractor/reimbursement/schedule journeys, owner-only automation, CSRF, corrupt/oversize receipts, company isolation and server-restart persistence. No payment submitted.');
} finally {await stop();}
