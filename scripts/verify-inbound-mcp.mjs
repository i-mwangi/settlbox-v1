import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {SeededWorkspaceRepository} from '../services/server/seeded-workspace.ts';
// Isolated production app: no local secrets, provider credentials or real funds.
const root=resolve('.data',`inbound-verification-${randomUUID()}`);mkdirSync(root,{recursive:true});
const config=JSON.parse(readFileSync('.data/treasury-config.json','utf8'));config.wallet.companyId='isolated-inbound-mcp';
const configPath=resolve(root,'config.json');writeFileSync(configPath,JSON.stringify(config));
const workspace=new SeededWorkspaceRepository(resolve(root,'business.sqlite'));try{workspace.seed(config.wallet.companyId,'entity-3',JSON.parse(readFileSync('public/demo-data-entity-3.json','utf8')));}finally{workspace.close();}
const listener=createServer();await new Promise(done=>listener.listen(0,'127.0.0.1',done));const port=listener.address().port;await new Promise(done=>listener.close(done));
const base=`http://127.0.0.1:${port}`;const operator=randomBytes(32).toString('hex');
const env={...process.env,PORT:String(port),HOSTNAME:'127.0.0.1',SETTLBOX_APP_ORIGIN:base,SETTLBOX_OPERATOR_TOKEN:operator,SETTLBOX_TREASURY_CONFIG:configPath,SETTLBOX_BUSINESS_DATABASE:resolve(root,'business.sqlite'),SETTLBOX_SESSION_DATABASE:resolve(root,'sessions.sqlite'),SETTLBOX_TREASURY_DATABASE:resolve(root,'treasury.sqlite'),CIRCLE_API_KEY:'',CIRCLE_ENTITY_SECRET:'',CIRCLE_USER_CONTROLLED_API_KEY:'',SETTLBOX_FINANCE_WORKER_TOKEN:'',SETTLBOX_PAYOUT_STATUS_TOKEN:''};
let child,cookie;const clients=[];
async function start(){child=spawn(process.execPath,[resolve('.next/standalone/server.js')],{cwd:resolve('.next/standalone'),env,windowsHide:true,stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',v=>logs+=v);child.stderr.on('data',v=>logs+=v);for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error(logs);try{await fetch(base+'/login');return;}catch{await new Promise(done=>setTimeout(done,200));}}throw new Error('Server unavailable');}
async function stop(){if(child&&child.exitCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done;}}
async function owner(path,body){return fetch(base+path,{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
async function credential(scopes){const response=await owner('/api/mcp-access',{action:'create',name:'Isolated client',scopes});assert.equal(response.status,200);return response.json();}
async function connect(token){const client=new Client({name:'inbound-verification',version:'1.0'});await client.connect(new StreamableHTTPClientTransport(new URL(base+'/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`}}}));clients.push(client);return client;}
const value=result=>JSON.parse(result.content[0].text);
try{
 await start();const login=await fetch(base+'/api/operator/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({token:operator})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await fetch(base+'/api/mcp',{headers:{Cookie:cookie}})).status,401);
 assert.equal((await fetch(base+'/api/mcp-access',{method:'POST',headers:{Cookie:cookie,Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{"action":"create"}'})).status,403);
 const full=await credential(['records:read','actions:propose']);const client=await connect(full.token);const tools=await client.listTools();assert.equal(tools.tools.length,4);assert.ok(!tools.tools.some(t=>/execute|confirm/.test(t.name)));
 const read=await credential(['records:read']);const readClient=await connect(read.token);assert.deepEqual((await readClient.listTools()).tools.map(t=>t.name),['settlbox_list_records']);
 await assert.rejects(readClient.callTool({name:'settlbox_propose_action',arguments:{}}));
 const auth={Authorization:`Bearer ${full.token}`,'Content-Type':'application/json'};
 assert.equal((await fetch(base+'/api/business-records',{method:'POST',headers:auth,body:'{}'})).status,401);
 assert.equal((await fetch(base+'/api/mcp',{method:'POST',headers:{...auth,Origin:'https://evil.invalid'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/mcp',{method:'POST',headers:auth,body:' '.repeat(65537)})).status,413);
 const input={kind:'bill',title:'External MCP verification',counterparty:'Test vendor',recipient:config.wallet.address,amount:'0.001',dueDate:'2026-10-14',description:'Isolated MCP review test'};
 const args={requestId:'create-bill',tool:'business.create',arguments:input};
 const proposal=value(await client.callTool({name:'settlbox_propose_action',arguments:args}));assert.equal(proposal.status,'pending');
 assert.equal(value(await client.callTool({name:'settlbox_list_records',arguments:{}})).records.length,0);
 assert.equal(value(await client.callTool({name:'settlbox_propose_action',arguments:args})).id,proposal.id);
 assert.equal((await client.callTool({name:'settlbox_propose_action',arguments:{...args,arguments:{...input,amount:'0.002'}}})).isError,true);
 const pending=await(await owner('/api/agent-actions')).json();assert.ok(pending.some(p=>p.id===proposal.id));
 const confirmation=await owner('/api/agent-actions',{action:'confirm',id:proposal.id});assert.equal(confirmation.status,200);assert.equal((await confirmation.json()).status,'completed');
 assert.equal((await owner('/api/agent-actions',{action:'confirm',id:proposal.id})).status,200);
 const records=value(await client.callTool({name:'settlbox_list_records',arguments:{}})).records;assert.equal(records.length,1);assert.equal(records[0].status,'draft');
 const edit=value(await client.callTool({name:'settlbox_propose_action',arguments:{requestId:'stale-edit',tool:'business.edit',arguments:{id:records[0].id,data:{...input,description:'External stale edit'}}}}));
 const directEdit=await fetch(base+'/api/business-records/'+records[0].id,{method:'PATCH',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'edit',data:{...input,description:'Owner changed the record'}})});assert.equal(directEdit.status,200);
 const stale=await(await owner('/api/agent-actions',{action:'confirm',id:edit.id})).json();assert.equal(stale.status,'uncertain');assert.equal(value(await client.callTool({name:'settlbox_list_records',arguments:{}})).records[0].description,'Owner changed the record');
 const externalPayment=value(await client.callTool({name:'settlbox_propose_action',arguments:{requestId:'review-payment',tool:'payment.review',arguments:{recordId:records[0].id}}}));assert.equal(externalPayment.status,'pending');
 assert.equal((await owner('/api/agent-actions',{action:'confirm',id:externalPayment.id})).status,409);assert.equal((await owner('/api/agent-actions',{action:'review',id:externalPayment.id})).status,200);
 assert.equal((await client.callTool({name:'settlbox_propose_action',arguments:{requestId:'no-execution',tool:'automation.run',arguments:{}}})).isError,true);
 const other=await credential(['actions:propose']);const otherClient=await connect(other.token);assert.equal((await otherClient.callTool({name:'settlbox_proposal_status',arguments:{id:proposal.id}})).isError,true);
 const revoke=await owner('/api/mcp-access',{action:'revoke',id:full.credential.id});assert.equal(revoke.status,200);
 assert.equal((await fetch(base+'/api/mcp',{method:'POST',headers:auth,body:'{}'})).status,401);
 assert.equal((await owner('/api/agent-actions',{action:'review',id:externalPayment.id})).status,409);
 assert.equal((await owner('/api/agent-actions',{action:'cancel',id:externalPayment.id})).status,200);
 const listing=JSON.stringify(await(await owner('/api/mcp-access')).json());assert.ok(!listing.includes(full.token));assert.ok(listing.includes('settlbox_propose_action'));
 await stop();await start();assert.equal((await fetch(base+'/api/mcp',{method:'POST',headers:auth,body:'{}'})).status,401);const reopened=await connect(read.token);assert.equal(value(await reopened.callTool({name:'settlbox_list_records',arguments:{}})).records.length,1);
 console.log('PASS: official MCP client initialization/discovery, scoped bearer access, immutable owner-reviewed proposals, payment handoff, revocation, isolation, audit, size/origin guards and restart persistence. No provider or payment contacted.');
}finally{for(const client of clients)await client.close().catch(()=>{});await stop();}
