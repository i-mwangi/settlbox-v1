import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceSeries} from '../presentation/services/utils/balance-timeseries.ts';
const now=new Date(2026,9,14,12,0,0).getTime();
const observation=(t,amount='20')=>({observedAt:new Date(t).toISOString(),amount});
test('balance chart retains distinct timestamps and filters rolling minute/hour windows',()=>{
 const rows=[observation(now-3600001),observation(now-30000,'19'),observation(now-10000,'18'),observation(now+1000),{observedAt:'bad',amount:'bad'}];
 const minute=balanceSeries(rows,'minute',now);assert.deepEqual(minute.points.map(p=>p.USDC),[19,18]);assert.ok(minute.domain[1]-minute.domain[0]<=60000);assert.ok(minute.ticks.every(t=>t>=minute.domain[0]&&t<=now));assert.equal(balanceSeries(rows,'hour',now).points.length,2);
});
test('calendar ranges include cross-month weeks and exclude future and older samples',()=>{
 const sunday=new Date(2026,10,1,12).getTime();const monday=new Date(2026,9,26,12).getTime();
 assert.equal(balanceSeries([observation(monday)],'week',sunday).points.length,1);
 assert.equal(balanceSeries([observation(monday)],'month',sunday).points.length,0);
});
test('chart adapts tick density to minutes, hours and months without inventing balances',()=>{
 for(const [period,span] of [['minute',30000],['day',3600000],['year',200*86400000]]){
  const series=balanceSeries([observation(now-span),observation(now)],period,now);assert.equal(series.points.length,2);assert.ok(series.ticks.length<=7);assert.equal(typeof series.label(now),'string');
 }
 const empty=balanceSeries([],'day',now);assert.deepEqual(empty.points,[]);assert.ok(empty.domain[0]<empty.domain[1]);
});
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {recordBalanceObservation} from '../services/server/balance-history.ts';
test('balance storage retains minute observations and returns chronological history',()=>{
 const dir=mkdtempSync(join(tmpdir(),'balance-minute-'));const saved=process.env.SETTLBOX_BUSINESS_DATABASE;process.env.SETTLBOX_BUSINESS_DATABASE=join(dir,'db.sqlite');const RealDate=Date;let clock=now;
 globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
 try{
  assert.equal(recordBalanceObservation('company','entity','wallet','20').length,1);
  clock+=10000;assert.equal(recordBalanceObservation('company','entity','wallet','19').length,1);
  clock+=60000;const rows=recordBalanceObservation('company','entity','wallet','18');assert.deepEqual(rows.map(r=>r.amount),['19','18']);assert.ok(rows[0].observedAt<rows[1].observedAt);assert.equal(recordBalanceObservation('other','entity','wallet','5').length,1);
 }finally{globalThis.Date=RealDate;if(saved===undefined)delete process.env.SETTLBOX_BUSINESS_DATABASE;else process.env.SETTLBOX_BUSINESS_DATABASE=saved;rmSync(dir,{recursive:true,force:true});}
});
