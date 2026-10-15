import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicClient} from 'viem';
import {arcReadTransport} from '../services/server/arc-read-transport.ts';

test('Arc reads retry a transient failure then fail over to backup without transaction submission',async()=>{
 const before=[process.env.NEXT_PUBLIC_ARC_RPC_URL,process.env.SETTLBOX_ARC_BACKUP_RPC_URL];
 process.env.NEXT_PUBLIC_ARC_RPC_URL='https://primary.example.invalid';process.env.SETTLBOX_ARC_BACKUP_RPC_URL='https://backup.example.invalid';
 try{
  const calls=[];
  const client=createPublicClient({transport:arcReadTransport({retryDelay:0,fetchFn:async(url,init)=>{
   calls.push(String(url).replace(/\/$/,''));const body=JSON.parse(init.body);
   if(String(url).includes('primary'))throw new TypeError('fetch failed with sensitive URL');
   return Response.json({jsonrpc:'2.0',id:body.id,result:'0x2a'});
  }})});
  assert.equal(await client.getBlockNumber({cacheTime:0}),42n);
  assert.deepEqual(calls,['https://primary.example.invalid','https://primary.example.invalid','https://backup.example.invalid']);
  const count=calls.length;
  await assert.rejects(client.request({method:'eth_sendRawTransaction',params:['0xdead']}),/reads only/);
  assert.equal(calls.length,count);
  const offline=createPublicClient({transport:arcReadTransport({retryDelay:0,fetchFn:async()=>{throw new Error('https://private.example.invalid/key')}})});
  await assert.rejects(offline.getBlockNumber({cacheTime:0}),error=>/Current Arc data is unavailable/.test(error.message)&&!error.message.includes('private.example'));
 }finally{for(const [index,key] of ['NEXT_PUBLIC_ARC_RPC_URL','SETTLBOX_ARC_BACKUP_RPC_URL'].entries())if(before[index]===undefined)delete process.env[key];else process.env[key]=before[index];}
});
