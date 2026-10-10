import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

async function main() {
  const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
  const url = new URL(base);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.protocol !== "http:") throw new Error("Verification server must be local HTTP");
  assert.equal((await fetch(`${base}/api/payment-links`)).status, 401);
  const session = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: process.env.SETTLBOX_OPERATOR_TOKEN }) });
  assert.equal(session.status, 200);
  const cookie = session.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
  const treasuryResponse = await fetch(`${base}/api/treasury`, { headers });
  assert.equal(treasuryResponse.status, 200);
  const treasury = await treasuryResponse.json();
  assert.equal(treasury.wallet.chainId, 5042002);
  const recipient = treasury.policy.allowedRecipients[0];
  const input = { title: "Settlbox verification", description: "Arc Testnet receipt verification", amount: "0.001", paymentWalletAddress: recipient };
  const unauthorized = await fetch(`${base}/api/payment-links`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify(input) });
  assert.equal(unauthorized.status, 401);
  const crossOrigin = await fetch(`${base}/api/payment-links`, { method: "POST", headers: { ...headers, Origin: "http://untrusted.example" }, body: JSON.stringify(input) });
  assert.equal(crossOrigin.status, 401);
  const invalid = await fetch(`${base}/api/payment-links`, { method: "POST", headers, body: JSON.stringify({ ...input, paymentWalletAddress: "0x1234" }) });
  assert.equal(invalid.status, 400);
  const path = ".data/payment-link-verification.json";
  const state = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { paymentId: randomUUID() };
  if (!state.code) {
    const created = await fetch(`${base}/api/payment-links`, { method: "POST", headers, body: JSON.stringify(input) });
    assert.equal(created.status, 201);
    state.code = (await created.json()).code;
    writeFileSync(path, JSON.stringify(state));
  }
  const publicLink = await fetch(`${base}/api/payment-links/${state.code}`);
  assert.equal(publicLink.status, 200);
  const link = await publicLink.json();
  assert.equal(link.amount, "0.001");
  assert.deepEqual(link.records, []);
  if (process.argv.includes("--settle")) {
    const payment = await fetch(`${base}/api/treasury/payments`, { method: "POST", headers: { ...headers, "Idempotency-Key": state.paymentId }, body: JSON.stringify({ recipient: link.paymentWalletAddress, amount: link.amount }) });
    assert.ok([200, 202].includes(payment.status));
    const execution = (await payment.json()).execution;
    if (execution.status === "awaiting_approval") assert.equal((await fetch(`${base}/api/treasury/payments/${state.paymentId}/approve`, { method: "POST", headers })).status, 200);
    for (let attempt = 0; attempt < 15 && !state.hash; attempt += 1) {
      const view = await fetch(`${base}/api/treasury`, { headers });
      assert.equal(view.status, 200);
      const record = (await view.json()).payments.find(item => item.intent.id === state.paymentId);
      if (record?.execution.status === "confirmed") {
        state.hash = record.execution.transactionHash;
        writeFileSync(path, JSON.stringify(state));
      } else await new Promise(resolve => setTimeout(resolve, 2000));
    }
    assert.ok(state.hash, "Test payment was not confirmed");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const verified = await fetch(`${base}/api/payment-links/${state.code}/payments`, { method: "POST", headers, body: JSON.stringify({ txid: state.hash }) });
      assert.equal(verified.status, 200);
      assert.equal((await verified.json()).paymentCount, 1);
    }
    console.log(`Arc Testnet payment-link settlement verified: ${state.hash}`);
  }
  console.log("Payment-link authentication, origin checks, validation, and public lookup passed");
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Payment-link verification failed"); process.exitCode = 1; });
