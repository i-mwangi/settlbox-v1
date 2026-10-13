import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FiatPayoutRepository, credentialHash } from '../services/server/fiat-payouts.ts';
import { reconcilePayoutChecks } from '../services/server/payout-reconciliation.ts';
import { startPayoutStatusWorker } from '../scripts/payout-status-worker.mjs';
const recipient = { id: 'recipient-test', name: 'Status fixture', email: 'qa@example.com', country: 'KE', currency: 'KES', channel: 'mobile_money', destinationCode: '0001', destinationSlug: 'safaricom-ke', destinationName: 'SAFARICOM', accountNumber: '254711111111', verification: 'unsupported' };
function create(store, company, request, hash = 'hash', state = 'processing') {
  store.saveRecipient(company, recipient);
  const draft = store.prepare(company, 'owner', request, recipient.id, '100', request, hash);
  if (state === 'pending_review') return draft;
  const claimed = store.claim(company, draft.id, 'owner', hash);
  return store.public(store.update(company, claimed, { status: state }, 'owner', 'fixture'));
}
test('durable leases exclude overlapping claims, reject stale completion and recover after a restart', () => {
  const root = mkdtempSync(join(tmpdir(), 'payout-poll-')); const path = join(root, 'test.sqlite');
  let first = new FiatPayoutRepository(path); const second = new FiatPayoutRepository(path); const now = Date.now();
  try {
    const payout = create(first, 'a', 'request-1'); create(first, 'b', 'request-2');
    const claim = first.claimChecks('a', now)[0]; assert.equal(claim.payoutId, payout.id);
    assert.equal(second.claimChecks('a', now + 1).length, 0);
    first.close(); first = new FiatPayoutRepository(path);
    const renewed = first.claimChecks('a', now + 180001)[0]; assert.notEqual(renewed.leaseToken, claim.leaseToken);
    assert.equal(second.finishCheck('a', claim, true, now + 180002), false);
    assert.equal(first.finishCheck('a', renewed, false, now + 180002), true);
    assert.equal(first.claimChecks('a', now + 180003).length, 0);
    const retry = first.claimChecks('a', now + 240003)[0]; assert.equal(retry.failures, 1);
    first.finishCheck('a', retry, false, now + 240003);
    assert.equal(first.claimChecks('a', now + 300004).length, 0);
    assert.equal(first.claimChecks('b', now).length, 1);
  } finally { first.close(); second.close(); rmSync(root, { recursive: true, force: true }); }
});
test('unsubmitted drafts and recent submissions cannot be polled; crashed submissions recover after grace period', () => {
  const store = new FiatPayoutRepository(':memory:');
  try {
    create(store, 'a', 'pending-request', 'hash', 'pending_review');
    const sending = create(store, 'a', 'sending-request', 'hash', 'submitting'); const now = Date.now();
    assert.equal(store.claimChecks('a', now).length, 0);
    const claims = store.claimChecks('a', now + 120001); assert.equal(claims.length, 1); assert.equal(claims[0].payoutId, sending.id);
  } finally { store.close(); }
});
test('bounded reconciliation only queries existing references, backs off failures and removes terminal jobs', async () => {
  const store = new FiatPayoutRepository(':memory:'); const originalFetch = globalThis.fetch; const previous = process.env.SETTLBOX_KORA_FIXTURE_KEY;
  process.env.SETTLBOX_KORA_FIXTURE_KEY = 'sk_test_fixture'; let queries = 0;
  try {
    const hash = credentialHash('SETTLBOX_KORA_FIXTURE_KEY');
    const drafts = Array.from({ length: 4 }, (_, index) => create(store, 'a', `processing-${index}`, hash));
    const pending = create(store, 'a', 'unsubmitted-request', hash, 'pending_review');
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, 'GET'); assert.equal(options.body, undefined); queries++;
      if (queries === 1) throw new Error('provider unavailable');
      const payout = drafts.find(row => url.endsWith(`/transactions/${row.reference}`)); assert.ok(payout);
      return Response.json({ status: true, data: { reference: payout.reference, amount: payout.amount, currency: payout.currency, status: 'success', fee: '0.00' } });
    };
    const now = Date.now(); const result = await reconcilePayoutChecks(store, 'a', 'SETTLBOX_KORA_FIXTURE_KEY', now);
    assert.deepEqual(result, { checked: 2, deferred: 1 }); assert.equal(queries, 3);
    assert.equal(store.stored('a', pending.id).status, 'pending_review');
    assert.equal(store.list('a').filter(row => row.status === 'sandbox_success').length, 2);
    assert.equal(store.claimChecks('a', now).length, 1, 'only the previously unclaimed fourth payout is due');
  } finally { store.close(); globalThis.fetch = originalFetch; if (previous === undefined) delete process.env.SETTLBOX_KORA_FIXTURE_KEY; else process.env.SETTLBOX_KORA_FIXTURE_KEY = previous; }
});
test('runner uses only the local status endpoint, prevents overlap and aborts on shutdown', async () => {
  const previousToken = process.env.SETTLBOX_PAYOUT_STATUS_TOKEN; const previousPort = process.env.PORT;
  process.env.SETTLBOX_PAYOUT_STATUS_TOKEN = 'fixture-status-token'.repeat(3); process.env.PORT = '3002';
  let resolve; let calls = 0; let signal; let stop;
  try {
    stop = startPayoutStatusWorker({ intervalMs: 10, transport: async (url, options) => { calls++; assert.equal(url, 'http://127.0.0.1:3002/api/payout-provider/reconcile'); assert.equal(options.method, 'POST'); assert.equal(options.body, undefined); signal = options.signal; return await new Promise(done => { resolve = done; }); } });
    await new Promise(done => setTimeout(done, 50)); assert.equal(calls, 1);
    stop(); assert.equal(signal.aborted, true); resolve(Response.json({ checked: 0 }));
    await new Promise(done => setTimeout(done, 20)); assert.equal(calls, 1);
  } finally { stop?.(); if (previousToken === undefined) delete process.env.SETTLBOX_PAYOUT_STATUS_TOKEN; else process.env.SETTLBOX_PAYOUT_STATUS_TOKEN = previousToken; if (previousPort === undefined) delete process.env.PORT; else process.env.PORT = previousPort; }
});
