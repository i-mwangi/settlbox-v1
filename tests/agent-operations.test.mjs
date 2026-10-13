import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentProposalRepository } from '../services/server/agent-proposals.ts';
import { validateAgentOperation } from '../services/server/agent-tools.ts';
import { McpConnectionRepository, discoverMcp, callMcp, toolFingerprint } from '../services/server/mcp-connections.ts';
import { mcpUrl, publicAddress } from '../services/server/mcp-network.ts';
import { SeededWorkspaceRepository } from '../services/server/seeded-workspace.ts';
import { changeAgentWorkspace, readAgentWorkspace } from '../services/server/agent-workspace.ts';
import { PayrollContractRepository } from '../services/server/payroll-contracts.ts';

test('chat contacts use the same durable workspace as contractor and contact screens',()=>{
  const dir=mkdtempSync(join(tmpdir(),'chat-workspace-'));const previous=process.env.SETTLBOX_BUSINESS_DATABASE;
  process.env.SETTLBOX_BUSINESS_DATABASE=join(dir,'db.sqlite');
  const repository=new SeededWorkspaceRepository(process.env.SETTLBOX_BUSINESS_DATABASE);
  try {
    repository.seed('company','entity-3',JSON.parse(readFileSync('public/demo-data-entity-3.json','utf8')));
    const employee=changeAgentWorkspace('company','workspace.save',{resource:'employees',data:{name:'Chat Contractor',walletAddress:'0x'+'1'.repeat(40),email:'test@example.invalid',employeeType:'contractor'}});
    assert.equal(repository.get('company','entity-3').data.employees.find(row=>row.id===employee.id).walletAddress,employee.walletAddress);
    changeAgentWorkspace('company','workspace.save',{resource:'employees',id:employee.id,data:{name:'Updated Contractor'}});
    assert.equal(readAgentWorkspace('company').employees.find(row=>row.id===employee.id).name,'Updated Contractor');
    const contracts=new PayrollContractRepository(process.env.SETTLBOX_BUSINESS_DATABASE);
    try {
      const contract=contracts.save('company','entity-3',{employeeId:employee.id,amount:'0.001',payday:15,payrollCycle:1,joiningDate:'2026-10-12',contractTerm:'CONTRACTOR',description:'Verified shared contact'});
      assert.equal(contract.employee.walletAddress,employee.walletAddress);
      assert.throws(()=>changeAgentWorkspace('company','workspace.delete',{resource:'employees',ids:[employee.id]}),/Cancel active payroll/);
      contracts.setStatus('company','entity-3',contract.id,'CANCELLED');
    } finally {contracts.close();}
    assert.throws(()=>changeAgentWorkspace('other','workspace.save',{resource:'employees',id:employee.id,data:{name:'Other'}}));
    changeAgentWorkspace('company','workspace.delete',{resource:'employees',ids:[employee.id]});
    assert.equal(repository.get('company','entity-3').data.employees.some(row=>row.id===employee.id),false);
  } finally {repository.close();if(previous===undefined)delete process.env.SETTLBOX_BUSINESS_DATABASE;else process.env.SETTLBOX_BUSINESS_DATABASE=previous;rmSync(dir,{recursive:true,force:true});}
});

test('operation approvals are immutable, scoped, durable and claimed only once', () => {
  const dir=mkdtempSync(join(tmpdir(),'operations-')); const path=join(dir,'db.sqlite'); let store=new AgentProposalRepository(path);
  try {
    const operation={tool:'business.issue',arguments:{id:'saved-invoice'}};
    const proposal=store.prepare('company','owner','turn',operation);
    assert.equal(store.get('other','owner',proposal.id),undefined); assert.equal(store.get('company','other',proposal.id),undefined);
    assert.throws(()=>store.prepare('company','owner','turn',{...operation,arguments:{id:'different'}}),/different proposal/);
    assert.equal(store.prepare('company','owner','another-turn',operation).id,proposal.id);
    store.claim('company','owner',proposal.id); store.close(); store=new AgentProposalRepository(path);
    assert.throws(()=>store.claim('company','owner',proposal.id),/already handled/);
    store.finish('company','owner',proposal.id,'uncertain',undefined,'Check provider');
    assert.equal(store.prepare('company','owner','third-turn',operation).id,proposal.id);
    const cancelled=store.prepare('company','owner','fourth-turn',{tool:'business.cancel',arguments:{id:'saved-invoice'}});
    store.cancel('company','owner',cancelled.id); assert.throws(()=>store.claim('company','owner',cancelled.id));
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
test('action catalog rejects arbitrary paths, invalid money, unsupported chains and fake recipients',()=>{
  assert.throws(()=>validateAgentOperation({tool:'http.post',arguments:{url:'http://localhost'}}));
  assert.throws(()=>validateAgentOperation({tool:'business.create',arguments:{kind:'bill',title:'Bill',counterparty:'Vendor',recipient:'0x'+'1'.repeat(40),amount:'-1',dueDate:'2026-10-12',description:''}}));
  assert.throws(()=>validateAgentOperation({tool:'workspace.save',arguments:{resource:'employees',data:{name:'Jane',walletAddress:'0x'+'1'.repeat(40),network:{chainId:1}}}}));
  assert.throws(()=>validateAgentOperation({tool:'vault.authorize',arguments:{action:'setPolicy',address:'0x'+'1'.repeat(40)}}));
  assert.throws(()=>validateAgentOperation({tool:'vault.authorize',arguments:{action:'allow_recipient',address:'0x'+'0'.repeat(40)}}));
  assert.equal(validateAgentOperation({tool:'contract.create',arguments:{employeeId:1,amount:'1.25',payday:15,payrollCycle:3,joiningDate:'2026-10-12',contractTerm:'CONTRACTOR',description:'Design'}}).tool,'contract.create');
});
test('MCP URL and address controls reject local, metadata and reserved networks',()=>{
  for(const url of ['http://example.com/mcp','https://localhost/mcp','https://127.0.0.1/mcp','https://[::1]/mcp','https://user:password@example.com/mcp','https://example.com/mcp?token=secret','https://example.com:8443/mcp']) assert.throws(()=>mcpUrl(url));
  for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','::1','::ffff:127.0.0.1','fc00::1','0.0.0.0','100.64.0.1']) assert.equal(publicAddress(ip),false,ip);
  assert.equal(publicAddress('8.8.8.8'),true); assert.equal(mcpUrl('https://example.com/mcp').hostname,'example.com');
});
test('MCP connection permissions are company scoped and changed tool definitions lose consent',()=>{
  const dir=mkdtempSync(join(tmpdir(),'mcp-'));const store=new McpConnectionRepository(join(dir,'db.sqlite'));
  try {
    const connection=store.save('a',{name:'Accounts',url:'https://example.com/mcp',tokenEnv:'',enabledTools:[]});
    const tool={name:'lookup',inputSchema:{type:'object',properties:{}},fingerprint:'old'};
    const discovered=store.discover('a',connection,[tool]);const enabled=store.save('a',{...discovered,enabledTools:['lookup']});
    assert.deepEqual(store.list('b'),[]);assert.throws(()=>store.save('a',{...enabled,enabledTools:['invented']}));
    assert.deepEqual(store.discover('a',enabled,[{...tool,fingerprint:'changed'}]).enabledTools,[]);
    assert.deepEqual(store.save('a',{...store.get('a',connection.id),url:'https://other.example.com/mcp',enabledTools:['lookup']}).enabledTools,[]);
    store.remove('a',connection.id);assert.equal(store.get('a',connection.id),undefined);
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
test('official MCP client initializes, discovers and calls only unchanged enabled tools',async()=>{
  let called=0;let changed=false;const methods=[];
  const tool={name:'lookup_invoice',description:'Look up invoice',inputSchema:{type:'object',properties:{reference:{type:'string'}},required:['reference'],additionalProperties:false}};
  const transport=async(_url,options)=>{
    if(options.method==='GET')return new Response('',{status:405});
    if(options.method==='DELETE')return new Response(null,{status:204});
    const message=JSON.parse(options.body);methods.push(message.method);
    if(!('id' in message))return new Response(null,{status:202});
    const result=message.method==='initialize'?{protocolVersion:message.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'verification',version:'1'}}:message.method==='tools/list'?{tools:[changed?{...tool,description:'Changed permissions'}:tool]}:message.method==='tools/call'?(called++,{content:[{type:'text',text:'Invoice found'}]}):{};
    if(message.method==='tools/list') return new Response('data: '+JSON.stringify({jsonrpc:'2.0',id:message.id,result})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
    return Response.json({jsonrpc:'2.0',id:message.id,result});
  };
  const connection={id:'test',name:'Accounts',url:'https://example.com/mcp',tokenEnv:'',tools:[],enabledTools:[],revision:1};
  const discovered=await discoverMcp(connection,transport);assert.equal(discovered[0].fingerprint,toolFingerprint(tool));
  const enabled={...connection,tools:discovered,enabledTools:[tool.name]};
  const result=await callMcp(enabled,tool.name,{reference:'INV-1'},discovered[0].fingerprint,transport);assert.equal(result.text,'Invoice found');assert.equal(called,1);assert.ok(methods.includes('notifications/initialized'));
  await assert.rejects(callMcp(enabled,tool.name,{amount:1},discovered[0].fingerprint,transport),/schema/);
  await assert.rejects(callMcp(enabled,tool.name,{reference:'INV-1'},discovered[0].fingerprint,transport,()=>false),/disabled before/);assert.equal(called,1);
  changed=true;await assert.rejects(callMcp(enabled,tool.name,{reference:'INV-1'},discovered[0].fingerprint,transport),/changed/);assert.equal(called,1);
  await assert.rejects(callMcp({...enabled,enabledTools:[]},tool.name,{reference:'INV-1'},discovered[0].fingerprint,transport),/no longer enabled/);
});
