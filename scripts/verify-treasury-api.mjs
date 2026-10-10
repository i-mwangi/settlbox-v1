import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

async function main() {
  const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
  const url = new URL(base);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.protocol !== "http:") throw new Error("Verification server must be local HTTP");
  const token = process.env.SETTLBOX_OPERATOR_TOKEN;
  if (!token) throw new Error("Workspace operator token is not configured");
  const publicResponse = await fetch(`${base}/api/treasury`);
  assert.equal(publicResponse.status, 401);
  const rejected = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: "invalid-token" }) });
  assert.equal(rejected.status, 401);
  const session = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  assert.equal(session.status, 200);
  const cookie = session.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Server did not issue a session cookie");
  const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
  const response = await fetch(`${base}/api/treasury`, { headers });
  assert.equal(response.status, 200);
  const treasury = await response.json();
  const path = process.env.SETTLBOX_VERIFY_JOURNAL || ".data/treasury-api-verification.json";
  const state = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { paymentId: randomUUID() };
  writeFileSync(path, JSON.stringify(state, null, 2));
  const body = JSON.stringify({ recipient: treasury.policy.allowedRecipients[0], amount: "0.001" });
  const requestHeaders = { ...headers, "Idempotency-Key": state.paymentId };
  const unauthorized = await fetch(`${base}/api/treasury/payments`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body });
  assert.equal(unauthorized.status, 401);
  const wrongOrigin = await fetch(`${base}/api/treasury/payments`, { method: "POST", headers: { ...requestHeaders, Origin: "http://untrusted.example" }, body });
  assert.equal(wrongOrigin.status, 401);
  const payment = await fetch(`${base}/api/treasury/payments`, { method: "POST", headers: requestHeaders, body });
  assert.ok(payment.status === 200 || payment.status === 202);
  const created = await payment.json();
  assert.equal(created.intent.companyId, treasury.wallet.companyId);
  const changedAmount = await fetch(`${base}/api/treasury/payments`, { method: "POST", headers: requestHeaders, body: JSON.stringify({ recipient: treasury.policy.allowedRecipients[0], amount: "0.002" }) });
  assert.equal(changedAmount.status, 409);
  if (created.execution.status === "awaiting_approval") {
    const approval = await fetch(`${base}/api/treasury/payments/${state.paymentId}/approve`, { method: "POST", headers });
    assert.equal(approval.status, 200);
  }
  const duplicate = await fetch(`${base}/api/treasury/payments`, { method: "POST", headers: requestHeaders, body });
  assert.equal(duplicate.status, 200);
  let confirmed;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const result = await fetch(`${base}/api/treasury`, { headers });
    assert.equal(result.status, 200);
    const view = await result.json();
    const records = view.payments.filter(record => record.intent.id === state.paymentId);
    assert.equal(records.length, 1);
    if (records[0].execution.status === "confirmed") { confirmed = records[0]; break; }
    if (records[0].execution.status === "failed") throw new Error("Arc Testnet payment failed");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!confirmed) throw new Error("Payment has not settled within the verification window");
  state.transactionHash = confirmed.execution.transactionHash;
  state.verifiedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(state, null, 2));
  const logout = await fetch(`${base}/api/operator/session`, { method: "DELETE", headers });
  assert.equal(logout.status, 200);
  const expired = await fetch(`${base}/api/treasury`, { headers });
  assert.equal(expired.status, 401);
  console.log(`Verified authenticated API → approval → Circle → Arc settlement → durable history: ${state.transactionHash}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message.slice(0, 500) : "API verification failed");
  process.exitCode = 1;
});
