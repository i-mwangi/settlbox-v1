import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FinanceWorkerStore } from '../services/server/finance-worker-store.ts';
import { financeWorkerCycle } from '../services/arc/finance-worker-cycle.ts';
const config = { enabled:true, autoQueue:true, reserveUsdc:'1', maxActions:2, revision:1 };
test('automation settings and audit survive reopening',()=>{
  const directory=mkdtempSync(join(tmpdir(),'settlbox-finance-worker-'));const path=join(directory,'worker.sqlite');
  let store=new FinanceWorkerStore(path);
  try {
    const {revision,...settings}=config;store.configure('a',settings,'owner');store.close();store=new FinanceWorkerStore(path);
    assert.equal(store.config('a').reserveUsdc,'1');assert.equal(store.config('a').enabled,true);assert.equal(store.history('a').length,1);
  } finally {store.close();rmSync(directory,{recursive:true,force:true});}
});
test('automation defaults stopped, validates settings and isolates companies', () => {
  const store = new FinanceWorkerStore(':memory:');
  try {
    assert.equal(store.acquire('a'), null);
    assert.throws(() => store.configure('a', {...config,revision:undefined}, 'owner'));
    const {revision,...settings}=config;
    store.configure('a',settings,'owner');
    assert.equal(store.config('b').enabled,false);
    assert.equal(store.history('b').length,0);
    assert.throws(()=>store.configure('a',{...settings,maxActions:6},'owner'));
    assert.throws(()=>store.configure('a',{...settings,reserveUsdc:'-1'},'owner'));
  } finally {store.close();}
});
test('leases reject overlapping cycles and stale release; stopping invalidates a running cycle',()=>{
  const store=new FinanceWorkerStore(':memory:');
  try {
    const {revision,...settings}=config;store.configure('a',settings,'owner');
    const first=store.acquire('a',1000);
    assert.equal(store.acquire('a',1001),null);
    const second=store.acquire('a',601001);
    store.release('a',first.token);
    assert.equal(store.active('a',second.token,second.config.revision,601002),true);
    store.configure('a',{...settings,enabled:false},'owner');
    assert.equal(store.active('a',second.token,second.config.revision,601003),false);
  } finally {store.close();}
});
function tools(overrides={}) {
  const calls=[];
  return {calls,active:()=>true,audit:()=>{},list:()=>[],reconcile:async id=>({recordId:id,status:'awaiting_approval'}),execute:async id=>calls.push(`execute:${id}`),candidates:async()=>({runId:'run',recordIds:['a','a','b','c']}),queue:async(_run,id)=>calls.push(`queue:${id}`),...overrides};
}
test('disabled cycles make no requests; queue attempts are deduplicated and bounded',async()=>{
  const stopped=tools();await financeWorkerCycle({...config,enabled:false},stopped);assert.deepEqual(stopped.calls,[]);
  const active=tools();await financeWorkerCycle(config,active);assert.deepEqual(active.calls,['queue:a','queue:b']);
});
test('human approval is never bypassed and failed execution attempts consume the cap',async()=>{
  const worker=tools({list:()=>['pending','ready1','ready2','ready3'].map(recordId=>({recordId,status:'queue_pending'})),reconcile:async id=>({recordId:id,status:id==='pending'?'awaiting_approval':'ready'})});
  worker.execute=async id=>{worker.calls.push(`execute:${id}`);throw new Error('provider unavailable');};
  await financeWorkerCycle(config,worker);assert.deepEqual(worker.calls,['execute:ready1','execute:ready2']);
});
test('stop after reconciliation prevents execution',async()=>{
  let active=true;const worker=tools({active:()=>active,list:()=>[{recordId:'a',status:'queue_pending'}],reconcile:async id=>{active=false;return {recordId:id,status:'ready'};}});
  await financeWorkerCycle(config,worker);assert.deepEqual(worker.calls,[]);
});
