import {DatabaseSync} from 'node:sqlite';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {mkdirSync} from 'node:fs';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export class IntegrationStore {
 private db:DatabaseSync;private key:Buffer;
 constructor(path:string,key:string){if(!/^[a-f0-9]{64}$/i.test(key))throw new Error('Configure SETTLBOX_INTEGRATION_ENCRYPTION_KEY on the server');this.key=Buffer.from(key,'hex');mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS service_connections(company TEXT,provider TEXT,secret TEXT,PRIMARY KEY(company,provider)); CREATE TABLE IF NOT EXISTS service_oauth_states(hash TEXT PRIMARY KEY,record TEXT); CREATE TABLE IF NOT EXISTS service_deliveries(company TEXT,event TEXT,status TEXT,at INTEGER,PRIMARY KEY(company,event))');const columns=new Set(this.db.prepare('PRAGMA table_info(service_deliveries)').all().map(row=>row.name));for(const [name,type] of [['attempts','INTEGER NOT NULL DEFAULT 1'],['next_retry','INTEGER NOT NULL DEFAULT 0'],['reason',"TEXT NOT NULL DEFAULT ''"]])if(!columns.has(name))this.db.exec(`ALTER TABLE service_deliveries ADD COLUMN ${name} ${type}`);}
 private encrypt(value:unknown){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',this.key,iv);const bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),bytes].map(b=>b.toString('base64')).join('.');}
 private decrypt(text:string){const [iv,tag,bytes]=text.split('.').map(s=>Buffer.from(s,'base64'));const cipher=createDecipheriv('aes-256-gcm',this.key,iv);cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(bytes),cipher.final()]).toString());}
 get(company:string,provider:string){const row=this.db.prepare('SELECT secret FROM service_connections WHERE company=? AND provider=?').get(company,provider);return row?this.decrypt(String(row.secret)):undefined;}
 save(company:string,provider:string,value:unknown){this.db.prepare('INSERT INTO service_connections VALUES(?,?,?) ON CONFLICT(company,provider) DO UPDATE SET secret=excluded.secret').run(company,provider,this.encrypt(value));}
 disconnect(company:string,provider:string){this.db.prepare('DELETE FROM service_connections WHERE company=? AND provider=?').run(company,provider);}
 state(company:string,principal:string,provider:string){const state=randomBytes(32).toString('hex');this.db.prepare('DELETE FROM service_oauth_states WHERE json_extract(record,\'$.expires\')<?').run(Date.now());this.db.prepare('INSERT INTO service_oauth_states VALUES(?,?)').run(digest(state),JSON.stringify({company,principal,provider,expires:Date.now()+600000}));return state;}
 consume(state:string,provider:string){this.db.exec('BEGIN IMMEDIATE');try{const row=this.db.prepare('SELECT record FROM service_oauth_states WHERE hash=?').get(digest(state));if(!row)throw new Error('Invalid authorization state');const record=JSON.parse(String(row.record));if(record.provider!==provider||record.expires<Date.now())throw new Error('Authorization expired');this.db.prepare('DELETE FROM service_oauth_states WHERE hash=?').run(digest(state));this.db.exec('COMMIT');return record as {company:string;principal:string};}catch(e){this.db.exec('ROLLBACK');throw e;}}
 claimDelivery(company:string,event:string){
  const now=Date.now();
  if(this.db.prepare("INSERT OR IGNORE INTO service_deliveries(company,event,status,at,attempts,reason) VALUES(?,?,'uncertain',?,1,'Delivery in progress or interrupted')").run(company,event,now).changes===1)return true;
  return this.db.prepare("UPDATE service_deliveries SET status='uncertain',at=?,attempts=attempts+1,reason='Delivery in progress or interrupted' WHERE company=? AND event=? AND status='retryable' AND next_retry<=? AND attempts<3").run(now,company,event,now).changes===1;
 }
 deliveryDone(company:string,event:string){this.db.prepare("UPDATE service_deliveries SET status='sent',reason='',next_retry=0 WHERE company=? AND event=?").run(company,event);}
 deliveryFailed(company:string,event:string,status:'uncertain'|'failed'|'retryable',reason:string,delaySeconds=0){
  this.db.prepare("UPDATE service_deliveries SET status=CASE WHEN ?='retryable' AND attempts>=3 THEN 'failed' ELSE ? END,reason=CASE WHEN ?='retryable' AND attempts>=3 THEN 'Slack rate limit retry limit reached. Check the connection before another attempt.' ELSE ? END,next_retry=? WHERE company=? AND event=? AND status='uncertain'").run(status,status,status,reason,Date.now()+delaySeconds*1000,company,event);
 }
 deliveries(company:string){return this.db.prepare("SELECT event,status,at,attempts,reason,next_retry FROM service_deliveries WHERE company=? ORDER BY at DESC LIMIT 20").all(company);}
 close(){this.db.close();}
}
export const openIntegrationStore=()=>new IntegrationStore(resolve(process.env.SETTLBOX_BUSINESS_DATABASE||'.data/business.sqlite'),process.env.SETTLBOX_INTEGRATION_ENCRYPTION_KEY||'');
