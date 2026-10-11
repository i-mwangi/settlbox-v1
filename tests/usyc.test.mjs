import test from 'node:test';
import assert from 'node:assert/strict';
import { usycContracts, verifyUsycIdentity, usycValuation, usycPermissionCalls } from '../services/arc/usyc.ts';
test('USYC rejects foreign networks and mismatched Teller dependencies',()=>{
  const identity=[usycContracts.asset,usycContracts.token,usycContracts.oracle,usycContracts.entitlements];
  verifyUsycIdentity(5042002,identity);
  assert.throws(()=>verifyUsycIdentity(1,identity));
  assert.throws(()=>verifyUsycIdentity(5042002,[...identity.slice(0,3),usycContracts.asset]));
});
test('USYC valuation preserves different token and oracle scales without floating point',()=>{
  assert.equal(usycValuation(123456789n,112345678n,6,8),'138.69836663907942');
  assert.equal(usycValuation(0n,112345678n,6,8),'0');
  assert.throws(()=>usycValuation(1n,0n,6,8));
  assert.throws(()=>usycValuation(1n,1n,255,8));
});
test('USYC permission checks include Teller actions and token receiving permissions',()=>{
  const wallet='0x1111111111111111111111111111111111111111';const calls=usycPermissionCalls(wallet);
  assert.equal(calls.length,4);assert.equal(calls[0][1],usycContracts.teller);assert.equal(calls[1][1],usycContracts.token);
  assert.deepEqual(calls[3].slice(0,2),[wallet,wallet]);
});
