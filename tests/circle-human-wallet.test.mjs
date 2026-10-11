import test from 'node:test';
import assert from 'node:assert/strict';
import { circleHumanUserId, circleHumanSessionKey } from '../services/server/circle-human-wallet.ts';
import { humanVaultAction } from '../services/arc/human-vault-action.ts';
import { HumanApprovalJournal } from '../services/server/human-approval-journal.ts';

test('human wallet identities are scoped to the company and principal', () => {
  assert.equal(circleHumanUserId('a','owner'),circleHumanUserId('a','owner'));
  assert.ok(circleHumanUserId('a','owner').length < 50);
  assert.notEqual(circleHumanUserId('a','owner'),circleHumanUserId('b','owner'));
  assert.notEqual(circleHumanUserId('a','owner'),circleHumanUserId('a','other'));
  assert.notEqual(circleHumanUserId('a:b','c'),circleHumanUserId('a','b:c'));
});
test('human challenge journal binds retries to the original action and isolates users', () => {
  const journal=new HumanApprovalJournal(':memory:');
  try {
    assert.equal(journal.reserve('a','request',{pause:true}),undefined);
    journal.save('a','request','challenge-1');
    assert.equal(journal.reserve('a','request',{pause:true}),'challenge-1');
    assert.throws(()=>journal.reserve('a','request',{pause:false}),/another action/);
    assert.equal(journal.reserve('b','request',{pause:false}),undefined);
  } finally {journal.close();}
});
test('human administration cannot submit arbitrary calls or turn the executor into an approver', () => {
  const executor='0x1111111111111111111111111111111111111111';
  assert.throws(()=>humanVaultAction('recover',executor,executor),/Unsupported/);
  assert.throws(()=>humanVaultAction('allow_approver',executor,executor),/executor cannot/);
  assert.throws(()=>humanVaultAction('allow_recipient','0x'+'0'.repeat(40),executor),/nonzero/);
  assert.deepEqual(humanVaultAction('pause',null,executor),{abiFunctionSignature:'setPaused(bool)',abiParameters:[true]});
  assert.deepEqual(humanVaultAction('unpause',null,executor),{abiFunctionSignature:'setPaused(bool)',abiParameters:[false]});
});
test('human wallet sessions are bound to the authenticated cookie without retaining the raw cookie', () => {
  const token='a'.repeat(64);
  assert.equal(circleHumanSessionKey(`other=x; settlbox_operator=${token}`),circleHumanSessionKey(`settlbox_operator=${token}`));
  assert.notEqual(circleHumanSessionKey(`settlbox_operator=${token}`),token);
  assert.notEqual(circleHumanSessionKey(`settlbox_operator=${token}`),circleHumanSessionKey(`settlbox_operator=${'b'.repeat(64)}`));
  assert.throws(()=>circleHumanSessionKey('other=x'),/session is required/);
});
