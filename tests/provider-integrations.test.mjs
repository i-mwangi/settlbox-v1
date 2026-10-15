import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {IntegrationStore} from '../services/server/integration-store.ts';
import {BusinessRecordRepository} from '../services/server/business-records.ts';
import {slackWebhook,sendSlack,slackRecordNotification,deliverSlackChanges,stripeSnapshot} from '../services/server/provider-integrations.ts';
test('Slack record cards contain real fields, safe text and only validated settlement links',async()=>{
 const row={kind:'bill',title:'<!channel> demo',amount:'0.001',status:'draft',transactionHash:null};
 const payload=slackRecordNotification(row);
 assert.ok(!payload.text.includes('<!channel>'));
 const blocks=payload.attachments[0].blocks;
 assert.equal(blocks[0].text.text,'Business record updated');
 assert.deepEqual(blocks[1].fields.map(field=>field.text),['Title: <!channel> demo','Amount: 0.001 USDC','Status: draft','Type: bill']);
 assert.ok(blocks[1].fields.every(field=>field.type==='plain_text'));
 assert.ok(blocks[2].text.text.includes('Not recorded'));
 assert.ok(!blocks.some(block=>block.type==='actions'));
 const hash='0x'+'a'.repeat(64);
 const settled=slackRecordNotification({...row,status:'paid',transactionHash:hash});
 assert.equal(settled.attachments[0].color,'#2EB67D');
 assert.equal(settled.attachments[0].blocks.at(-1).elements[0].url,`https://testnet.arcscan.app/tx/${hash}`);
 assert.ok(!slackRecordNotification({...row,transactionHash:'https://evil.invalid'}).attachments[0].blocks.some(block=>block.type==='actions'));
 process.env.SETTLBOX_SLACK_CARD_WEBHOOK_URL='https://hooks.slack.com/services/A/B/C';
 try{await sendSlack('SETTLBOX_SLACK_CARD_WEBHOOK_URL',payload,async(url,init)=>{assert.deepEqual(JSON.parse(init.body),payload);return new Response('ok')});}finally{delete process.env.SETTLBOX_SLACK_CARD_WEBHOOK_URL;}
});
test('Slack limits destinations to official incoming webhooks and does not confirm failures',async()=>{
 const name='SETTLBOX_SLACK_FIXTURE_WEBHOOK_URL';process.env[name]='https://evil.invalid/services/a/b/c';assert.throws(()=>slackWebhook(name));process.env[name]='https://hooks.slack.com/services/A/B/C';let calls=0;await sendSlack(name,'hello',async(url,init)=>{calls++;assert.equal(url,'https://hooks.slack.com/services/A/B/C');assert.equal(init.redirect,'error');return new Response('ok')});assert.equal(calls,1);await assert.rejects(sendSlack(name,'hello',async()=>new Response('bad',{status:500})));delete process.env[name];
});
test('Slack automatic delivery is opt-in, company scoped and does not retry uncertain posts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'slack-'));const path=join(dir,'db');const previous=process.env.SETTLBOX_BUSINESS_DATABASE;process.env.SETTLBOX_BUSINESS_DATABASE=path;process.env.SETTLBOX_SLACK_FIXTURE_WEBHOOK_URL='https://hooks.slack.com/services/A/B/C';const store=new IntegrationStore(path,'b'.repeat(64));const records=new BusinessRecordRepository(path);try{
 records.create('company',{kind:'bill',title:'<!channel> fixture',counterparty:'Vendor',recipient:'0x1111111111111111111111111111111111111111',amount:'0.001',dueDate:'2026-10-31',description:''});let calls=0;const fetcher=async(url,init)=>{calls++;assert.ok(!JSON.parse(init.body).text.includes('<!channel>'));throw new Error('ambiguous network failure')};store.save('company','slack',{keyEnv:'SETTLBOX_SLACK_FIXTURE_WEBHOOK_URL',enabled:false,baseline:[]});await deliverSlackChanges('company',store,fetcher);assert.equal(calls,0);store.save('company','slack',{keyEnv:'SETTLBOX_SLACK_FIXTURE_WEBHOOK_URL',enabled:true,baseline:[]});await deliverSlackChanges('other',store,fetcher);assert.equal(calls,0);await deliverSlackChanges('company',store,fetcher);assert.equal(calls,1);await deliverSlackChanges('company',store,fetcher);assert.equal(calls,1);assert.equal(store.deliveries('company')[0].status,'uncertain');
 }finally{records.close();store.close();if(previous===undefined)delete process.env.SETTLBOX_BUSINESS_DATABASE;else process.env.SETTLBOX_BUSINESS_DATABASE=previous;delete process.env.SETTLBOX_SLACK_FIXTURE_WEBHOOK_URL;rmSync(dir,{recursive:true,force:true});}
});
test('Stripe snapshot accepts restricted keys only and issues read requests to Stripe',async()=>{
 const name='SETTLBOX_STRIPE_FIXTURE_READ_KEY';process.env[name]='sk_test_full';await assert.rejects(stripeSnapshot(name));process.env[name]='rk_test_fixture';const calls=[];const data=await stripeSnapshot(name,async(url,init)=>{calls.push(url);assert.equal(init.method,undefined);assert.equal(init.headers.Authorization,'Bearer rk_test_fixture');assert.equal(init.redirect,'error');if(url.endsWith('/account'))return Response.json({id:'acct_fixture',business_profile:{name:'Fixture'}});if(url.includes('/customers?'))return Response.json({data:[{id:'cus_fixture',name:'Vendor',email:'fixture@example.invalid'}],has_more:false});if(url.includes('/invoices?'))return Response.json({data:[{id:'in_fixture',status:'paid',currency:'usd',amount_due:100,customer:'cus_fixture'}],has_more:true});return Response.json({data:[],has_more:false});});assert.equal(calls.length,4);assert.equal(data.mode,'test');assert.equal(data.invoices[0].status,'paid');assert.equal(data.moreAvailable,true);assert.ok(!JSON.stringify(data).includes('rk_test_fixture'));delete process.env[name];
});
