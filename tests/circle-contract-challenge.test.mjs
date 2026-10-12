import test from 'node:test';
import assert from 'node:assert/strict';
import { circleContractChallenge } from '../services/arc/circle-contract-challenge.ts';

test('wallet-ID challenges exclude conflicting blockchain and wallet-address selectors', () => {
  for (const call of [
    { abiFunctionSignature: 'acceptOwnership()', abiParameters: [] },
    { abiFunctionSignature: 'setPaused(bool)', abiParameters: [true] },
  ]) {
    const payload = circleContractChallenge('request', 'wallet', 'contract', { ...call, blockchain: 'ARC-TESTNET', walletAddress: 'unexpected' });
    assert.equal(payload.walletId, 'wallet');
    assert.equal(Object.hasOwn(payload, 'blockchain'), false);
    assert.equal(Object.hasOwn(payload, 'walletAddress'), false);
    assert.equal(payload.amount, '0');
    assert.deepEqual(payload.abiParameters, call.abiParameters);
  }
});
