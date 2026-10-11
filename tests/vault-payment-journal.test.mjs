import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BusinessRecordRepository } from '../services/server/business-records.ts';
import { VaultPaymentJournal, vaultPaymentId, vaultProviderKey } from '../services/server/vault-payment-journal.ts';
const recipient = '0x1111111111111111111111111111111111111111';
function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(),'settlbox-vault-test-')); const path = join(dir,'business.sqlite');
  const records = new BusinessRecordRepository(path); const journal = new VaultPaymentJournal(path);
  try { return fn(records,journal); } finally { journal.close(); records.close(); rmSync(dir,{recursive:true,force:true}); }
}
function create(records, company='company') { return records.create(company,{kind:'bill',title:'Vendor payment',counterparty:'Vendor',recipient,amount:'0.001',dueDate:'2026-10-11',description:'Services'}); }
function payment(record) { return {id:vaultPaymentId(record.companyId,recipient,record.id),companyId:record.companyId,recordId:record.id,runId:'run',recipient,amount:'0.001',expiresAt:'1800000000',createdAt:new Date().toISOString(),requestedBy:'owner',status:'queue_pending'}; }
test('vault reservation freezes a saved draft and survives reopening without duplicate allocation',()=>fixture((records,journal)=>{
  const record=create(records);const first=journal.reserve(payment(record));
  assert.equal(records.get('company',record.id).status,'awaiting_approval');
  assert.deepEqual(journal.reserve({...payment(record),runId:'another-run'}),first);
  assert.equal(journal.list('company').length,1);
  assert.throws(()=>records.updateDraft('company',record.id,{...record,amount:'0.002'}),/draft/);
  assert.throws(()=>records.claimPaymentRoute('company',record.id,'treasury'),/different/);
}));
test('a direct treasury route prevents a second vault settlement',()=>fixture((records,journal)=>{
  const record=create(records);records.claimPaymentRoute('company',record.id,'treasury');
  assert.throws(()=>journal.reserve(payment(record)),/another payment route/);
  assert.equal(records.get('company',record.id).status,'draft');assert.equal(journal.list('company').length,0);
}));
test('reservations enforce aggregate liquidity rather than accepting each payment independently',()=>fixture((records,journal)=>{
  const first=create(records);const second=create(records);
  journal.reserve(payment(first),1000000000000000n);
  assert.throws(()=>journal.reserve(payment(second),1000000000000000n),/reserved liquidity/);
  assert.equal(records.get('company',second.id).status,'draft');
  assert.equal(journal.reserved('company'),1000000000000000n);
}));
test('reservation rejects changed terms, historical paid records and company spoofing',()=>fixture((records,journal)=>{
  const record=create(records);
  assert.throws(()=>journal.reserve({...payment(record),amount:'0.002'}),/changed/);
  assert.throws(()=>journal.reserve({...payment(record),companyId:'other'}),/changed/);
  records.transition('company',record.id,'paid',['draft']);
  assert.throws(()=>journal.reserve(payment(record)),/already/);
}));
test('provider requests and audit history are company-scoped and stage-specific',()=>fixture((records,journal)=>{
  const record=create(records);const saved=journal.reserve(payment(record));
  journal.patch(saved,{queueProviderId:'provider'},'Queue accepted');
  assert.equal(journal.get('company',record.id).queueProviderId,'provider');
  assert.equal(journal.get('other',record.id),undefined);assert.equal(journal.events('other').length,0);
  assert.equal(journal.events('company').length,2);
  assert.equal(vaultProviderKey(saved.id,'queue'),vaultProviderKey(saved.id,'queue'));
  assert.notEqual(vaultProviderKey(saved.id,'queue'),vaultProviderKey(saved.id,'execute'));
  assert.notEqual(vaultPaymentId('other',recipient,record.id),saved.id);
}));
