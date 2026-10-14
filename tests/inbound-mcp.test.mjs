import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {InboundMcpRepository} from '../services/server/inbound-mcp.ts';
import {inboundRpc,inboundTools,inboundOriginAllowed} from '../services/server/inbound-mcp-protocol.ts';
test('inbound MCP origin trust does not depend on attacker-controlled Host headers',()=>{
 assert.equal(inboundOriginAllowed('https://evil.invalid',undefined,'3002'),false);
 assert.equal(inboundOriginAllowed('http://127.0.0.1:3002',undefined,'3002'),true);
 assert.equal(inboundOriginAllowed('http://127.0.0.1:9999',undefined,'3002'),false);
 assert.equal(inboundOriginAllowed(null,undefined,'3002'),true);
 assert.equal(inboundOriginAllowed('https://settlbox.example','https://settlbox.example'),true);
 assert.equal(inboundOriginAllowed('https://evil.invalid','https://settlbox.example'),false);
});
test('inbound MCP credentials are hashed, scoped, isolated, expiring and revocable across restarts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'inbound-'));const path=join(dir,'db.sqlite');let store=new InboundMcpRepository(path);
 try{
  const {token,credential}=store.create('company','owner','Client',['records:read']);
  assert.equal(readFileSync(path).includes(Buffer.from(token)),false);
  assert.deepEqual(inboundTools(credential).map(t=>t.name),['settlbox_list_records']);
  assert.throws(()=>store.authenticate(token,'other'));assert.throws(()=>store.authenticate(token+'x','company'));
  assert.throws(()=>store.create('company','owner','Bad',['payments:execute']));
  store.close();store=new InboundMcpRepository(path);assert.equal(store.authenticate(token,'company').id,credential.id);
  store.link(credential.id,'r','payload','proposal');assert.equal(store.request(credential.id,'r','payload'),'proposal');assert.throws(()=>store.request(credential.id,'r','changed'));
  assert.equal(store.owns('other','proposal'),false);store.assertProposalActive('company','owner','proposal');
  store.revoke('company','owner',credential.id);assert.throws(()=>store.authenticate(token,'company'));assert.throws(()=>store.assertProposalActive('company','owner','proposal'));
  const second=store.create('company','owner','Expiry',['actions:propose']);const db=new DatabaseSync(path);db.prepare('UPDATE inbound_mcp_credentials SET record=? WHERE id=?').run(JSON.stringify({...second.credential,expiresAt:0}),second.credential.id);db.close();assert.throws(()=>store.authenticate(second.token,'company'));
  assert.ok(store.events('company','owner').some(e=>e.event==='revoked'));assert.equal(store.events('other','owner').length,0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('inbound MCP rate limits are durable and reset only in a new minute',()=>{
 const dir=mkdtempSync(join(tmpdir(),'inbound-rate-'));const store=new InboundMcpRepository(join(dir,'db.sqlite'));
 try{for(let i=0;i<120;i++)store.consume('client',0);assert.throws(()=>store.consume('client',0));store.consume('client',60000);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('MCP protocol never invokes tools from notifications, hidden scopes or malformed calls',async()=>{
 const credential={scopes:['records:read']};let calls=0;const invoke=async()=>{calls++;return[]};
 const call=(method,params,id=1)=>inboundRpc({jsonrpc:'2.0',method,params,id},credential,invoke);
 assert.equal((await call('tools/call',{name:'settlbox_propose_action',arguments:{}})).error.code,-32602);
 assert.equal((await inboundRpc({jsonrpc:'2.0',method:'tools/call',params:{name:'settlbox_list_records'}},credential,invoke)).error.code,-32600);
 assert.equal((await call('tools/call',{name:'settlbox_list_records',arguments:[]})).error.code,-32602);
 assert.equal(calls,0);assert.equal((await call('tools/call',{name:'settlbox_list_records',arguments:{}})).result.content[0].text,'[]');assert.equal(calls,1);
 assert.equal((await call('tools/call',{name:'settlbox_list_records'},1)).result.isError,undefined);
 assert.equal((await call('initialize',{protocolVersion:'invented'})).result.protocolVersion,'2025-11-25');
 assert.equal((await call('payments/execute',{})).error.code,-32601);
});
