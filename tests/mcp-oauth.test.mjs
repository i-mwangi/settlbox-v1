import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {McpOAuthRepository} from '../services/server/mcp-oauth.ts';
import {InboundMcpRepository} from '../services/server/inbound-mcp.ts';
function fixture(run){const dir=mkdtempSync(join(tmpdir(),'oauth-'));const path=join(dir,'db');const repo=new McpOAuthRepository(path,'https://app.example');const inbound=new InboundMcpRepository(path);try{run(repo,inbound,path);}finally{inbound.close();repo.close();rmSync(dir,{recursive:true,force:true});}}
function flow(repo,method='none'){
 const client=repo.register({client_name:'Claude fixture',redirect_uris:['https://client.example/callback'],token_endpoint_auth_method:method});
 const verifier='v'.repeat(43);const query=new URLSearchParams({client_id:client.client_id,redirect_uri:client.redirect_uris[0],response_type:'code',state:'unpredictable-state',code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url'),scope:'records:read actions:propose',resource:'https://app.example/api/mcp'});
 const redirect=new URL(repo.consent(query,{company:'company',principal:'owner'},['records:read'],true));
 const form=new URLSearchParams({grant_type:'authorization_code',client_id:client.client_id,code:redirect.searchParams.get('code'),redirect_uri:client.redirect_uris[0],code_verifier:verifier});
 if(method==='client_secret_post')form.set('client_secret',client.client_secret);
 return {client,query,redirect,form};
}
test('OAuth PKCE, exact redirect, resource and owner validation precede one-time token exchange',()=>fixture((repo,inbound,path)=>{
 const f=flow(repo);assert.equal(f.redirect.searchParams.get('state'),'unpredictable-state');assert.equal(f.redirect.searchParams.get('iss'),'https://app.example');
 for(const [key,value] of [['code_verifier','x'.repeat(43)],['redirect_uri','https://evil.example'],['resource','https://evil.example/api/mcp']]){const bad=new URLSearchParams(f.form);bad.set(key,value);assert.throws(()=>repo.token(bad,null));}
 assert.throws(()=>repo.token(f.form,null,()=>{throw new Error('Removed owner');}));
 const token=repo.token(f.form,null);assert.equal(token.scope,'records:read');assert.equal(inbound.authenticate(token.access_token,'company').resource,'https://app.example/api/mcp');assert.throws(()=>inbound.authenticate(token.access_token,'other'));
 assert.equal(readFileSync(path).includes(Buffer.from(token.access_token)),false);assert.equal(readFileSync(path).includes(Buffer.from(token.refresh_token)),false);
 assert.throws(()=>repo.token(f.form,null));assert.throws(()=>inbound.authenticate(token.access_token,'company'));
}));
test('OAuth refresh rotates, detects replay and respects manual revocation',()=>fixture((repo,inbound)=>{
 const f=flow(repo);const one=repo.token(f.form,null);const refresh=new URLSearchParams({grant_type:'refresh_token',client_id:f.client.client_id,refresh_token:one.refresh_token});
 const bad=new URLSearchParams(refresh);bad.set('scope','records:read actions:propose');assert.throws(()=>repo.token(bad,null));
 const two=repo.token(refresh,null);assert.throws(()=>inbound.authenticate(one.access_token,'company'));assert.ok(inbound.authenticate(two.access_token,'company'));
 assert.throws(()=>repo.token(refresh,null));assert.throws(()=>inbound.authenticate(two.access_token,'company'));
 const second=flow(repo);const token=repo.token(second.form,null);const credential=inbound.authenticate(token.access_token,'company');inbound.revoke('company','owner',credential.id);assert.throws(()=>repo.token(new URLSearchParams({grant_type:'refresh_token',client_id:second.client.client_id,refresh_token:token.refresh_token}),null));
}));
test('OAuth consent denial, unsupported registration and confidential client authentication',()=>fixture(repo=>{
 assert.throws(()=>repo.register({redirect_uris:['http://evil.example/callback']}));assert.throws(()=>repo.register({redirect_uris:['https://safe.example/#fragment']}));
 const f=flow(repo,'client_secret_post');const wrong=new URLSearchParams(f.form);wrong.set('client_secret','wrong');assert.throws(()=>repo.token(wrong,null));assert.ok(repo.token(f.form,null).access_token);
 const denied=new URL(repo.consent(f.query,{company:'company',principal:'owner'},[],false));assert.equal(denied.searchParams.get('error'),'access_denied');assert.equal(denied.searchParams.has('code'),false);
 const invalid=new URLSearchParams(f.query);invalid.set('redirect_uri','https://client.example/callback/');assert.throws(()=>repo.authorization(invalid));invalid.set('redirect_uri',f.client.redirect_uris[0]);invalid.set('code_challenge_method','plain');assert.throws(()=>repo.authorization(invalid));
 const basic=flow(repo,'client_secret_basic');assert.ok(repo.token(basic.form,'Basic '+Buffer.from(basic.client.client_id+':'+basic.client.client_secret).toString('base64')).access_token);
}));
import {DatabaseSync} from 'node:sqlite';
test('OAuth expired codes and grants cannot mint credentials',()=>fixture((repo,inbound,path)=>{
 const f=flow(repo);const db=new DatabaseSync(path);
 const codeHash=createHash('sha256').update(f.form.get('code')).digest('hex');const row=db.prepare('SELECT record FROM mcp_oauth_codes WHERE hash=?').get(codeHash);const code=JSON.parse(row.record);
 db.prepare('UPDATE mcp_oauth_codes SET record=? WHERE hash=?').run(JSON.stringify({...code,expires:0}),codeHash);assert.throws(()=>repo.token(f.form,null));
 db.prepare('UPDATE mcp_oauth_codes SET record=? WHERE hash=?').run(JSON.stringify({...code,expires:Date.now()+120000}),codeHash);
 const grant=JSON.parse(db.prepare('SELECT record FROM mcp_oauth_grants WHERE id=?').get(code.grant).record);db.prepare('UPDATE mcp_oauth_grants SET record=? WHERE id=?').run(JSON.stringify({...grant,expires:0}),grant.id);assert.throws(()=>repo.token(f.form,null));assert.equal(inbound.list('company','owner').length,0);db.close();
}));
