import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {IntegrationStore} from '../services/server/integration-store.ts';
import {parseSheetRows,sheetsHeaders,sheetExport,googleJson} from '../services/server/google-sheets.ts';
const wallet='0x5807412f16da9077917270ebd157f30f2ab94da1';
test('integration secrets are encrypted, isolated and authorization states are single-use',()=>{
 const dir=mkdtempSync(join(tmpdir(),'integration-'));const path=join(dir,'db');const store=new IntegrationStore(path,'a'.repeat(64));try{store.save('a','google-sheets',{refreshToken:'private-google-secret'});assert.equal(readFileSync(path).includes(Buffer.from('private-google-secret')),false);assert.equal(store.get('b','google-sheets'),undefined);assert.equal(store.get('a','google-sheets').refreshToken,'private-google-secret');const state=store.state('a','owner','google-sheets');assert.throws(()=>store.consume(state,'slack'));assert.equal(store.consume(state,'google-sheets').principal,'owner');assert.throws(()=>store.consume(state,'google-sheets'));store.disconnect('a','google-sheets');assert.equal(store.get('a','google-sheets'),undefined);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('Sheets imports validate all rows, prevent duplicate IDs and bind invoices to treasury',()=>{
 const row=['vendor-1','bill','Services','Vendor',wallet,'0.001','2026-10-31','Test'];const rows=[sheetsHeaders,row];const first=parseSheetRows(rows,'a','sheet',wallet);assert.equal(first[0].input.amount,'0.001');assert.equal(first[0].id,parseSheetRows(rows,'a','sheet',wallet)[0].id);assert.notEqual(first[0].id,parseSheetRows(rows,'b','sheet',wallet)[0].id);assert.throws(()=>parseSheetRows([sheetsHeaders,row,row],'a','sheet',wallet));assert.throws(()=>parseSheetRows([['bad'],row],'a','sheet',wallet));assert.throws(()=>parseSheetRows([sheetsHeaders,[...row.slice(0,5),'=SUM(A1)','2026-10-31','']],'a','sheet',wallet));assert.throws(()=>parseSheetRows([sheetsHeaders,['id','invoice','Title','Client','0x1111111111111111111111111111111111111111','1','2026-10-31','']],'a','sheet',wallet));
});
test('Google transport uses fixed caller URL, bearer auth, timeout and raw export values',async()=>{
 const values=sheetExport([{id:'a',kind:'bill',title:'=unsafe formula',counterparty:'v',recipient:wallet,amount:'1',dueDate:'2026-10-31',description:'',status:'draft',transactionHash:null}]);assert.equal(values[1][2],'=unsafe formula');let captured;await googleJson('https://sheets.googleapis.com/v4/spreadsheets','secret',{method:'PUT',body:JSON.stringify({values})},async(url,init)=>{captured=init;return new Response('{}')});assert.equal(captured.headers.Authorization,'Bearer secret');assert.equal(captured.redirect,'error');await assert.rejects(googleJson('https://sheets.googleapis.com/x','secret',{},async()=>new Response('private-provider-error',{status:403})),/Google request failed \(403\)/);
});
