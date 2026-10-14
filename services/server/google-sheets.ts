import {createHash} from 'node:crypto';
import {validateBusinessRecord} from './business-records.ts';
import type {BusinessRecord} from '../../types/business';
export const sheetsHeaders=['sourceId','kind','title','counterparty','recipient','amount','dueDate','description'];
export function parseSheetRows(rows:unknown,company:string,sheet:string,wallet:string){
 if(!Array.isArray(rows)||rows.length>101||!rows.length||!Array.isArray(rows[0])||sheetsHeaders.some((h,i)=>rows[0][i]!==h))throw new Error('Use the supplied eight-column import template (maximum 100 rows)');
 const seen=new Set<string>();return rows.slice(1).filter(row=>Array.isArray(row)&&row.some(v=>String(v).trim())).map((row,index)=>{
  if(!Array.isArray(row)||row.length>8||row.some(v=>typeof v!=='string')||!row[0]?.trim()||row[0].length>100)throw new Error(`Invalid sourceId or cells at row ${index+2}`);
  if(seen.has(row[0]))throw new Error('Duplicate sourceId');seen.add(row[0]);
  const input=validateBusinessRecord({kind:row[1],title:row[2],counterparty:row[3],recipient:row[4],amount:row[5],dueDate:row[6],description:row[7]||''});
  if(!['invoice','bill','payroll'].includes(input.kind))throw new Error('Import supports invoices, bills and payroll drafts');if(input.kind==='invoice'&&input.recipient.toLowerCase()!==wallet.toLowerCase())throw new Error('Invoices must collect to the company treasury wallet');
  const hex=createHash('sha256').update(JSON.stringify([company,sheet,row[0]])).digest('hex');const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
  return {sourceId:row[0],id,input};
 });
}
export function sheetExport(records:BusinessRecord[]){return [['recordId','kind','title','counterparty','recipient','amount','dueDate','description','status','transactionHash'],...records.map(r=>[r.id,r.kind,r.title,r.counterparty,r.recipient,r.amount,r.dueDate,r.description,r.status,r.transactionHash||''])];}
export async function googleJson(url:string,token:string,init:RequestInit={},fetcher:typeof fetch=fetch){const response=await fetcher(url,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(15000),redirect:'error'});const raw=await response.text();if(!response.ok)throw new Error(`Google request failed (${response.status}). Check connection and spreadsheet access.`);if(raw.length>2000000)throw new Error('Google response too large');return JSON.parse(raw);}
export const googleConfig=()=>{const client=process.env.SETTLBOX_GOOGLE_CLIENT_ID||'';const secret=process.env.SETTLBOX_GOOGLE_CLIENT_SECRET||'';const redirect=process.env.SETTLBOX_GOOGLE_REDIRECT_URI||'';if(!client||!secret||!redirect)throw new Error("Configure Google OAuth on the server");const url=new URL(redirect);if(!client||!secret||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))||url.pathname!=='/api/integrations/google-sheets/callback'||url.search||url.hash)throw new Error('Configure Google OAuth on the server');return {client,secret,redirect};};
