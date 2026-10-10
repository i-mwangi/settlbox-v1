import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const base = process.env.SETTLBOX_VERIFY_URL || "http://127.0.0.1:3002";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const session = await fetch(`${base}/api/operator/session`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ token: process.env.SETTLBOX_OPERATOR_TOKEN }) });
assert.equal(session.status, 200);
const cookie = session.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
async function call(path, method = "GET", body, expected = 200) {
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json();
  assert.equal(response.status, expected, typeof value.error === "string" ? value.error : "Unexpected response status");
  return value;
}
const file = ".data/reimbursement-verification.json";
const identities = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { id: randomUUID(), rejectionId: randomUUID() };
writeFileSync(file, JSON.stringify(identities, null, 2));
const action = (id, action) => call("/api/reimbursements", "POST", { entity: "entity-3", id, action });
try {
  assert.equal((await fetch(`${base}/api/reimbursements`)).status, 401);
  assert.equal((await fetch(`${base}/api/reimbursements`, { method: "POST", headers: { ...headers, Origin: "https://example.test" }, body: "{}" })).status, 401);
  const rows = await call("/api/reimbursements?entity=entity-3");
  assert.equal(rows.filter(row => row.historical).length, 6);
  await call("/api/reimbursements", "POST", { entity: "entity-3", id: "r-001", action: "pay" }, 409);
  let record = rows.find(row => row.id === identities.id);
  if (!record) {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64")], { type: "image/png" }), "test-receipt.png");
    const upload = await fetch(`${base}/api/uploads`, { method: "POST", headers: { Cookie: cookie, Origin: base }, body: form });
    assert.equal(upload.status, 201);
    const receipt = await upload.json();
    assert.equal((await fetch(`${base}${receipt.url}`, { headers })).status, 200);
    assert.equal((await fetch(`${base}${receipt.url}`)).status, 401);
    record = await call("/api/reimbursements", "POST", { entity: "entity-3", action: "create", record: { id: identities.id, employeeName: "Arc expense verification", recipient: "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5", description: "Persisted receipt and Arc Testnet expense verification", amountExact: "0.001", currency: "USDC", category: "Other", date: new Date().toISOString().slice(0, 10), receiptUrl: receipt.url, receiptName: "test-receipt.png" } }, 201);
  }
  const retry = await call("/api/reimbursements", "POST", { entity: "entity-3", action: "create", record }, 201);
  assert.equal(retry.id, record.id);
  await call("/api/reimbursements", "POST", { entity: "primary", id: record.id, action: "approve" }, 404);
  if (record.status === "pending") record = await action(record.id, "approve");
  const treasury = await call("/api/treasury");
  assert.equal(treasury.wallet.chainId, 5042002);
  assert.equal(treasury.policy.maxPaymentBaseUnits, "1000000000000000");
  if (!rows.some(row => row.id === identities.rejectionId)) {
    await call("/api/reimbursements", "POST", { entity: "entity-3", action: "create", record: { ...record, id: identities.rejectionId, amountExact: "0.002", receiptUrl: null, receiptName: null } }, 201);
    await action(identities.rejectionId, "approve");
  }
  const rejected = await call("/api/reimbursements", "POST", { entity: "entity-3", id: identities.rejectionId, action: "pay" }, 409);
  assert.match(rejected.error, /limit/);
  if (process.argv.includes("--settle")) {
    if (record.status === "approved") record = await action(record.id, "pay");
    if (record.status === "awaiting_approval") record = await action(record.id, "authorize");
    for (let attempt = 0; attempt < 20 && record.status !== "paid"; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      record = await action(record.id, "refresh");
      assert.notEqual(record.status, "failed");
    }
    assert.equal(record.status, "paid");
    const replay = await action(record.id, "pay");
    assert.equal(replay.transactionHash, record.transactionHash);
    const workspace = await call("/api/seeded-workspace?entity=entity-3");
    assert.equal(workspace.data.transactions.filter(row => row.id === record.id).length, 1);
  }
  assert.equal((await call("/api/reimbursements?entity=entity-3")).filter(row => row.id === record.id).length, 1);
  console.log(JSON.stringify({ id: record.id, status: record.status, receiptPersisted: true, historicalPaymentBlocked: true, policyRejectionVerified: true, entityIsolationVerified: true, transactionHash: record.transactionHash, paymentSubmitted: process.argv.includes("--settle") }));
} finally { await fetch(`${base}/api/operator/session`, { method: "DELETE", headers }); }
