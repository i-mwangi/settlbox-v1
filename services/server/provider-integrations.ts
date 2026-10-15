import type {BusinessRecord} from '../../types/business';
import {createHash} from 'node:crypto';
import {openIntegrationStore,type IntegrationStore} from './integration-store.ts';
import {openBusinessRecords} from './business-records.ts';
export function slackWebhook(variable:string){if(!/^SETTLBOX_SLACK_[A-Z0-9_]+_WEBHOOK_URL$/.test(variable))throw new Error('Choose a Slack webhook environment variable');const raw=process.env[variable]||'';const url=new URL(raw);if(url.origin!=='https://hooks.slack.com'||!/^\/services\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/[A-Za-z0-9]+$/.test(url.pathname)||url.search||url.hash)throw new Error('Configure a valid Slack incoming webhook on the server');return url.href;}
type SlackMessage={text:string;attachments?:unknown[]};
export class SlackDeliveryError extends Error {
 deliveryStatus:'uncertain'|'failed'|'retryable';retryAfter:number;
 constructor(message:string,deliveryStatus:'uncertain'|'failed'|'retryable',retryAfter=0){super(message);this.deliveryStatus=deliveryStatus;this.retryAfter=retryAfter;}
}
export async function sendSlack(variable:string,message:string|SlackMessage,fetcher:typeof fetch=fetch){
 const url=slackWebhook(variable);
 let response:Response;
 try{response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(typeof message==='string'?{text:message}:message),signal:AbortSignal.timeout(25000),redirect:'error'});}
 catch{throw new SlackDeliveryError('Slack response was not received. Check the channel before resending.','uncertain');}
 if(response.status===429){const delay=Number(response.headers.get('retry-after')||60);throw new SlackDeliveryError('Slack rate limit rejected this notification. A bounded retry is scheduled.','retryable',Number.isFinite(delay)?Math.min(3600,Math.max(1,delay)):60);}
 if(response.status>=400&&response.status<500&&response.status!==408)throw new SlackDeliveryError(`Slack rejected this notification (HTTP ${response.status}). Check the webhook configuration.`,'failed');
 try{if(response.ok&&(await response.text()).trim()==='ok')return;}catch{}
 throw new SlackDeliveryError('Slack did not confirm delivery. Check the channel before resending.','uncertain');
}
const slackText=(value:string)=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
export function slackRecordNotification(row:BusinessRecord):SlackMessage {
 const status=row.status.replaceAll('_',' ');
 const hash=row.transactionHash&&/^0x[0-9a-f]{64}$/i.test(row.transactionHash)?row.transactionHash:null;
 const field=(label:string,value:string)=>({type:'plain_text',text:`${label}: ${value}`.slice(0,1900),emoji:false});
 const blocks:unknown[]=[
  {type:'header',text:{type:'plain_text',text:'Business record updated',emoji:false}},
  {type:'section',fields:[field('Title',row.title),field('Amount',`${row.amount} USDC`),field('Status',status),field('Type',row.kind)]},
  {type:'section',text:field('Transaction',hash||'Not recorded - no confirmed settlement hash')},
  {type:'context',elements:[{type:'plain_text',text:'Arc Testnet · Payment authorization stays in Settlbox.',emoji:false}]},
 ];
 if(hash)blocks.push({type:'actions',elements:[{type:'button',action_id:'view_arc_transaction',text:{type:'plain_text',text:'View transaction',emoji:false},url:`https://testnet.arcscan.app/tx/${hash}`}]});
 return {text:`Settlbox: ${row.kind} “${slackText(row.title)}” — ${row.amount} USDC — ${slackText(status)}`,attachments:[{color:row.status==='paid'?'#2EB67D':row.status==='cancelled'?'#E01E5A':'#36C5F0',blocks}]};
}
export const slackVersion=(r:{id:string;status:string;updatedAt:string})=>createHash('sha256').update(JSON.stringify([r.id,r.status,r.updatedAt])).digest('hex');
export async function deliverSlackChanges(company:string,store:IntegrationStore,fetcher:typeof fetch=fetch,pause:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 const saved=store.get(company,'slack');if(!saved?.enabled||Number(saved.notBefore||0)>Date.now())return {sent:0};
 const records=openBusinessRecords();
 try{
  const rows=records.list(company).slice(0,1000);const baseline=new Set<string>(saved.baseline||[]);let sent=0;let attempted=0;let notBefore=0;
  for(const row of rows){
   const key=slackVersion(row);if(baseline.has(key))continue;if(attempted>=10)break;
   if(!store.claimDelivery(company,key))continue;
   if(attempted>0)await pause(1100);attempted++;
   try{await sendSlack(saved.keyEnv,slackRecordNotification(row),fetcher);store.deliveryDone(company,key);baseline.add(key);sent++;}
   catch(error){const issue=error instanceof SlackDeliveryError?error:new SlackDeliveryError('Notification could not be confirmed; check the channel.','uncertain');store.deliveryFailed(company,key,issue.deliveryStatus,issue.message,issue.retryAfter);if(issue.deliveryStatus!=='retryable')baseline.add(key);else {notBefore=Date.now()+issue.retryAfter*1000;break;}}
  }
  const current=store.get(company,'slack');if(current)store.save(company,'slack',{...current,notBefore,baseline:[...new Set([...(current.baseline||[]),...baseline])].slice(-2000)});return {sent,attempted};
 }finally{records.close();}
}
export async function runSlackNotifications(company:string){if(!process.env.SETTLBOX_INTEGRATION_ENCRYPTION_KEY)return {sent:0};const store=openIntegrationStore();try{return await deliverSlackChanges(company,store);}finally{store.close();}}
export async function stripeSnapshot(variable:string,fetcher:typeof fetch=fetch){if(!/^SETTLBOX_STRIPE_[A-Z0-9_]+_READ_KEY$/.test(variable))throw new Error('Choose a Stripe read-key environment variable');const key=process.env[variable]||'';if(!/^rk_(test|live)_/.test(key))throw new Error('Configure a restricted Stripe API key; full-access secret keys are not accepted');
 const get=async(path:string)=>{const response=await fetcher('https://api.stripe.com/v1/'+path,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(15000),redirect:'error'});const raw=await response.text();if(!response.ok)throw new Error(`Stripe read failed (${response.status}). Check restricted-key read permissions.`);if(raw.length>2000000)throw new Error('Stripe response too large');return JSON.parse(raw);};
 const account=await get('account');const [customers,invoices,charges]=await Promise.all([get('customers?limit=100'),get('invoices?limit=100'),get('charges?limit=100')]);
 return {accountId:account.id,accountName:account.business_profile?.name||account.id,mode:key.startsWith('rk_test_')?'test':'live',syncedAt:new Date().toISOString(),customers:customers.data.map((r:any)=>({id:r.id,name:r.name,email:r.email})),invoices:invoices.data.map((r:any)=>({id:r.id,number:r.number,status:r.status,currency:r.currency,amount:r.amount_due,customer:typeof r.customer==='string'?r.customer:r.customer?.id,created:r.created})),charges:charges.data.map((r:any)=>({id:r.id,status:r.status,currency:r.currency,amount:r.amount,created:r.created})),moreAvailable:!!(customers.has_more||invoices.has_more||charges.has_more)};
}
