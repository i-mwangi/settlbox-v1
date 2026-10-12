import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const path = '.data/agent-executor.json';
const treasury = JSON.parse(readFileSync('.data/treasury-config.json', 'utf8')).wallet;
const client = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY, entitySecret: process.env.CIRCLE_ENTITY_SECRET });
let record;
if (existsSync(path)) record = JSON.parse(readFileSync(path, 'utf8'));
else {
  const treasuryWallet = (await client.getWallet({ id: treasury.id })).data?.wallet;
  if (treasuryWallet?.blockchain !== 'ARC-TESTNET' || !treasuryWallet.walletSetId) throw new Error('Arc treasury wallet set is required');
  const hex = createHash('sha256').update(`settlbox-agent-executor-v1:${treasury.companyId}`).digest('hex');
  const idempotencyKey = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
  const response = await client.createWallets({ walletSetId: treasuryWallet.walletSetId, idempotencyKey, blockchains: ['ARC-TESTNET'], accountType: 'EOA', count: 1 });
  const wallet = response.data?.wallets?.[0];
  if (!wallet?.id || !wallet.address) throw new Error('Circle did not return an execution wallet');
  record = { companyId: treasury.companyId, walletId: wallet.id, address: wallet.address, blockchain: 'ARC-TESTNET', createdAt: new Date().toISOString() };
  mkdirSync('.data', { recursive: true }); writeFileSync(path, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
}
const observed = (await client.getWallet({ id: record.walletId })).data?.wallet;
if (record.companyId !== treasury.companyId || observed?.blockchain !== 'ARC-TESTNET' || observed.custodyType !== 'DEVELOPER' || observed.address.toLowerCase() !== record.address.toLowerCase()) throw new Error('Execution wallet verification failed');
console.log(JSON.stringify({ prepared: true, address: record.address, walletId: record.walletId, fundsMoved: false }));
