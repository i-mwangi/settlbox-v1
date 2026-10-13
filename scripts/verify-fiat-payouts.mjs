import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID, randomBytes, createHmac } from 'node:crypto';
import { createServer } from 'node:net';
import { AgentProposalRepository } from '../services/server/agent-proposals.ts';
import { SeededWorkspaceRepository } from '../services/server/seeded-workspace.ts';
import { TeamMemberRepository } from '../services/server/team-members.ts';
import { createOperatorSession, sessionCookie } from '../services/server/operator-session.ts';

// Isolated production-route verification with fixed fake provider responses.
// This harness never loads .env.local, real provider keys or financial balances.
const root = resolve('.data', `fiat-boundaries-${randomUUID()}`); mkdirSync(root, { recursive: true });
const config = JSON.parse(readFileSync('.data/treasury-config.json', 'utf8')); config.wallet.companyId = 'isolated-fiat-boundaries';
const configPath = resolve(root, 'config.json'); writeFileSync(configPath, JSON.stringify(config));
const database = resolve(root, 'business.sqlite'); const mockPath = resolve(root, 'provider-fixture.mjs');
const seed = new SeededWorkspaceRepository(database);
try { seed.seed(config.wallet.companyId, 'entity-3', JSON.parse(readFileSync('public/demo-data-entity-3.json', 'utf8'))); } finally { seed.close(); }
writeFileSync(mockPath, `
const originalFetch=globalThis.fetch;const payouts=new Map();
globalThis.fetch=async(input,options={})=>{
 const url=String(input);if(!url.startsWith('https://api.korapay.com/'))return originalFetch(input,options);
 const body=options.body?JSON.parse(options.body):{};
 if(url.includes('/misc/banks?'))return Response.json({status:true,data:[{name:'Fixture Bank',code:'033',slug:'fixture-bank'}]});
 if(url.includes('/misc/mobile-money?'))return Response.json({status:true,data:[{name:'Fixture Operator',code:'0001',slug:'safaricom-ke'}]});
 if(url.endsWith('/misc/banks/resolve'))return Response.json({status:true,data:{bank_code:body.bank,account_number:body.account,account_name:'Fixture account'}});
 if(url.endsWith('/transactions/disburse')){const data={reference:body.reference,amount:body.destination.amount,currency:body.destination.currency,status:'success',fee:'0.00'};payouts.set(body.reference,data);if(body.destination.narration.includes('timeout'))throw new Error('timeout after acceptance');return Response.json({status:true,data});}
 const reference=url.split('/').at(-1);if(payouts.has(reference))return Response.json({status:true,data:payouts.get(reference)});
 return Response.json({status:false},{status:404});
};
`);
const listener = createServer(); await new Promise(done => listener.listen(0, '127.0.0.1', done));
const port = listener.address().port; await new Promise(done => listener.close(done)); const base = `http://127.0.0.1:${port}`;
const token = randomBytes(32).toString('hex');
const env = { ...process.env, SETTLBOX_BUSINESS_DATABASE: database, SETTLBOX_SESSION_DATABASE: resolve(root, 'sessions.sqlite'), SETTLBOX_TREASURY_DATABASE: resolve(root, 'treasury.sqlite'), SETTLBOX_TREASURY_CONFIG: configPath, PORT: String(port), HOSTNAME: '127.0.0.1', NEXT_PUBLIC_ARC_ENVIRONMENT: 'testnet', SETTLBOX_APP_ORIGIN: base, SETTLBOX_OPERATOR_TOKEN: token, SETTLBOX_KORA_FIXTURE_KEY: 'sk_test_fixture', SETTLBOX_KORA_FIXTURE_PUBLIC_KEY: 'pk_test_fixture', SETTLBOX_KORA_LIVE_KEY: 'sk_live_fixture', CIRCLE_API_KEY: '', CIRCLE_ENTITY_SECRET: '', SETTLBOX_AI_PROVIDER: '' };
Object.assign(process.env, { SETTLBOX_BUSINESS_DATABASE: database, SETTLBOX_SESSION_DATABASE: env.SETTLBOX_SESSION_DATABASE, SETTLBOX_TREASURY_CONFIG: configPath });
const restrictedCookies = [];
const team = new TeamMemberRepository(database);
try {
  for (const [index, role] of ['ADMIN', 'REVIEWER', 'VIEWER'].entries()) {
    const invite = team.invite(config.wallet.companyId, { firstName: role, email: `${role.toLowerCase()}@example.invalid`, role });
    const challenge = team.challenge(config.wallet.companyId, `0x${String(index + 1).padStart(40, '0')}`, base, invite.token);
    const member = team.consumeChallenge(config.wallet.companyId, challenge.id);
    const session = createOperatorSession({ id: `member:${member.uuid}`, memberId: member.id, companyId: config.wallet.companyId, role });
    restrictedCookies.push(sessionCookie(session.token, false).split(';')[0]);
  }
} finally { team.close(); }
let child; let cookie = '';
async function start() {
  child = spawn(process.execPath, ['--import', pathToFileURL(mockPath).href, resolve('.next/standalone/server.js')], { cwd: resolve('.next/standalone'), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stdout.on('data', part => logs += part); child.stderr.on('data', part => logs += part);
  for (let attempt = 0; attempt < 100; attempt++) { if (child.exitCode !== null) throw new Error(`Verification server exited: ${logs}`); try { await fetch(`${base}/login`); return; } catch { await new Promise(done => setTimeout(done, 200)); } }
  throw new Error('Verification server did not start');
}
async function stop() { if (child && child.exitCode === null) { const ended = new Promise(done => child.once('exit', done)); child.kill(); await ended; } }
async function request(body, options = {}) {
  return fetch(`${base}/api/payout-provider`, { method: body === undefined ? 'GET' : 'POST', headers: { Cookie: options.cookie ?? cookie, Origin: options.origin ?? base, 'Content-Type': 'application/json', ...(options.id ? { 'Idempotency-Key': options.id } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function success(body, options) { const response = await request(body, options); const value = await response.json(); assert.equal(response.status, 200, JSON.stringify(value)); return value; }
try {
  await start(); assert.equal((await request(undefined)).status, 403);
  const login = await fetch(`${base}/api/operator/session`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
  for (const restricted of restrictedCookies) {
    assert.equal((await request(undefined, { cookie: restricted })).status, 403);
    assert.equal((await request({ action: 'save', keyEnv: 'SETTLBOX_KORA_FIXTURE_KEY' }, { cookie: restricted })).status, 403);
  }
  assert.equal((await request({ action: 'save', keyEnv: 'SETTLBOX_KORA_FIXTURE_KEY' }, { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await request({ action: 'save', keyEnv: 'SETTLBOX_KORA_LIVE_KEY' })).status, 400);
  await success({ action: 'save', keyEnv: 'SETTLBOX_KORA_FIXTURE_KEY' });
  const recipientBody = { action: 'recipient', recipient: { name: 'Fixture recipient', email: 'qa@example.com', country: 'NG', channel: 'bank_account', accountNumber: '0000000000', destinationCode: '033' } };
  const recipient = await success(recipientBody, { id: 'recipient-request-1' });
  assert.equal(recipient.verification, 'unverified');
  assert.equal((await request({ action: 'prepare', recipientId: recipient.id, amount: '100', narration: 'Blocked until verification', requestId: 'request-blocked' })).status, 400);
  await success({ action: 'verify', id: recipient.id });
  assert.equal((await success(recipientBody, { id: 'recipient-request-1' })).verification, 'sandbox_verified');
  assert.equal((await request({ ...recipientBody, recipient: { ...recipientBody.recipient, accountNumber: '1111111111' } }, { id: 'recipient-request-1' })).status, 400);
  assert.equal((await request({ action: 'prepare', recipientId: recipient.id, amount: '500', narration: 'Provider minimum', requestId: 'request-below-minimum' })).status, 400);
  const draft = await success({ action: 'prepare', recipientId: recipient.id, amount: '1000', narration: 'Verified sandbox flow', requestId: 'request-payout-1' });
  assert.equal(draft.status, 'pending_review'); assert.equal(draft.credentialHash, undefined);
  assert.equal((await request({ action: 'submit', id: draft.id, confirmSandbox: true, amount: '999' })).status, 400);
  assert.equal((await request({ action: 'submit', id: draft.id })).status, 400);
  const submitted = await success({ action: 'submit', id: draft.id, confirmSandbox: true }); assert.equal(submitted.status, 'sandbox_success');
  assert.equal((await request({ action: 'submit', id: draft.id, confirmSandbox: true })).status, 400);
  const uncertain = await success({ action: 'prepare', recipientId: recipient.id, amount: '1001', narration: 'timeout recovery fixture', requestId: 'request-payout-2' });
  assert.equal((await success({ action: 'submit', id: uncertain.id, confirmSandbox: true })).status, 'uncertain');
  assert.equal((await request({ action: 'submit', id: uncertain.id, confirmSandbox: true })).status, 400);
  assert.equal((await fetch(`${base}/api/payout-provider/webhook`, { method: 'POST', body: '{}' })).status, 401);
  const eventData = { reference: uncertain.reference, status: 'failed', amount: 999, currency: 'KES' };
  const signature = createHmac('sha256', 'sk_test_fixture').update(JSON.stringify(eventData)).digest('hex');
  const webhook = await fetch(`${base}/api/payout-provider/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-korapay-signature': signature }, body: JSON.stringify({ data: eventData }) });
  assert.equal(webhook.status, 200);
  assert.equal((await success({ action: 'status', id: uncertain.id })).status, 'sandbox_success');
  const proposals = new AgentProposalRepository(database);
  try {
    const proposal = proposals.prepare(config.wallet.companyId, 'workspace-operator', randomUUID(), { tool: 'payout.prepare', arguments: { recipientId: recipient.id, amount: '1002', narration: 'Chat review fixture' } });
    const response = await fetch(`${base}/api/agent-actions`, { method: 'POST', headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: proposal.id, action: 'confirm' }) });
    const result = await response.json(); assert.equal(result.status, 'completed', JSON.stringify(result)); assert.equal(result.result.status, 'pending_review');
  } finally { proposals.close(); }
  await stop(); await start(); const snapshot = await success();
  assert.equal(snapshot.payouts.find(row => row.id === draft.id).status, 'sandbox_success');
  assert.ok(snapshot.events.some(event => event.event.includes('authorized')));
  assert.equal(snapshot.liveEnabled, false);
  console.log('PASS: production payout routes enforce authentication, CSRF, test-only keys, recipient verification, idempotency, immutable approval, single submission, uncertainty recovery, chat dispatch and restart persistence. No financial provider was contacted.');
} finally { await stop(); }
