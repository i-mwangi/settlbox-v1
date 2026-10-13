import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { validateAgentOperation } from "../services/server/agent-tools.ts";
import { FiatPayoutRepository, fiatAmount, validateFiatRecipient, payoutPayload, reconciledPayout, submitFiatPayout, refreshFiatPayout, credentialHash, validKoraWebhook, fiatChatResult } from "../services/server/fiat-payouts.ts";
const recipient = { id: "recipient-1", name: "Sandbox fixture", email: "qa@example.com", country: "KE", currency: "KES", channel: "mobile_money", destinationCode: "0001", destinationSlug: "safaricom-ke", destinationName: "SAFARICOM", accountNumber: "254711111111", verification: "unsupported" };
test("Chat submission cannot display or inject replacement financial terms", () => {
  assert.equal(validateAgentOperation({ tool: "payout.submit", arguments: { id: "saved-payout" } }).tool, "payout.submit");
  for (const override of [{ amount: "999" }, { currency: "USDC" }, { recipientId: "other" }, { confirmSandbox: false }]) assert.throws(() => validateAgentOperation({ tool: "payout.submit", arguments: { id: "saved-payout", ...override } }), /cannot be changed/);
});
test("Webhook signatures bind exact event data; chat results minimize account information", () => {
  const previous = process.env.SETTLBOX_KORA_FIXTURE_KEY; process.env.SETTLBOX_KORA_FIXTURE_KEY = "sk_test_fixture";
  try {
    const data = { reference: "fixture", amount: 100, status: "success" };
    const signature = createHmac("sha256", "sk_test_fixture").update(JSON.stringify(data)).digest("hex");
    assert.equal(validKoraWebhook("SETTLBOX_KORA_FIXTURE_KEY", data, signature), true);
    assert.equal(validKoraWebhook("SETTLBOX_KORA_FIXTURE_KEY", { ...data, amount: 101 }, signature), false);
    assert.equal(validKoraWebhook("SETTLBOX_KORA_FIXTURE_KEY", data, "invalid"), false);
    const result = fiatChatResult({ recipient }); assert.equal(result.recipient.accountLastFour, "1111"); assert.equal(result.recipient.email, undefined); assert.equal(result.recipient.accountNumber, undefined);
  } finally { if (previous === undefined) delete process.env.SETTLBOX_KORA_FIXTURE_KEY; else process.env.SETTLBOX_KORA_FIXTURE_KEY = previous; }
});
test("Fiat amounts are exact, bounded and never accept scientific or fractional cents", () => {
  assert.equal(fiatAmount("10.1"), "10.10"); assert.equal(fiatAmount("0.01"), "0.01");
  for (const value of [0.1, "1e3", "0", "-1", "01", "1.001", "1000000.01", "NaN"]) assert.throws(() => fiatAmount(value));
  assert.equal(validateFiatRecipient({ ...recipient, accountNumber: "+254711111111" }).accountNumber, "254711111111");
  assert.throws(() => validateFiatRecipient({ ...recipient, country: "NG" }));
  assert.throws(() => validateFiatRecipient({ ...recipient, accountNumber: "0711111111" }));
});
test("Payouts are scoped, immutable, expire and permit a single atomic submission claim", () => {
  const store = new FiatPayoutRepository(":memory:");
  try {
    store.saveRecipient("a", recipient); assert.equal(store.recipient("b", recipient.id), undefined);
    const payout = store.prepare("a", "owner", "request-1", recipient.id, "100", "Sandbox payment", "hash");
    assert.equal(store.prepare("a", "owner", "request-1", recipient.id, "100.00", "Sandbox payment", "hash").id, payout.id);
    assert.throws(() => store.prepare("a", "owner", "request-1", recipient.id, "101", "Sandbox payment", "hash"));
    assert.throws(() => store.prepare("a", "owner", "request-2", recipient.id, "100", "Sandbox payment", "hash"), /identical/);
    assert.throws(() => store.claim("b", payout.id, "owner", "hash"));
    assert.throws(() => store.claim("a", payout.id, "other", "hash"));
    assert.throws(() => store.claim("a", payout.id, "owner", "changed"));
    const claimed = store.claim("a", payout.id, "owner", "hash");
    assert.throws(() => store.claim("a", payout.id, "owner", "hash"), /already/);
    assert.throws(() => store.update("a", { ...claimed, narration: "stale" }, { status: "failed" }, "owner", "stale"));
    assert.equal(JSON.stringify(store.list("a")).includes("credentialHash"), false);
    const other = store.prepare("a", "owner", "request-3", recipient.id, "200", "Expiry", "hash");
    const original = store.stored("a", other.id);
    store.update("a", original, { expiresAt: "2000-01-01T00:00:00Z" }, "owner", "test expiry");
    assert.throws(() => store.claim("a", other.id, "owner", "hash"), /expired/);
  } finally { store.close(); }
});
test("Reconciliation matches exact identity, local currency and amount; sandbox success is separate from paid", () => {
  const store = new FiatPayoutRepository(":memory:");
  try {
    store.saveRecipient("a", recipient); const payout = store.prepare("a", "owner", "request-1", recipient.id, "100", "Sandbox payment", "hash");
    assert.equal(payoutPayload(payout).destination.mobile_money.operator, "safaricom-ke");
    const data = { reference: payout.reference, amount: 100, currency: "KES", status: "success", fee: 5 };
    assert.equal(reconciledPayout(payout, data).status, "sandbox_success");
    for (const changes of [{ reference: "other" }, { amount: 101 }, { currency: "USDC" }, { status: "invented" }, { fee: "1e10" }]) assert.throws(() => reconciledPayout(payout, { ...data, ...changes }));
  } finally { store.close(); }
});
test("Provider minimums block undersized NGN drafts before any submission", () => {
  const store = new FiatPayoutRepository(":memory:");
  try {
    store.saveRecipient("a", { ...recipient, country: "NG", currency: "NGN", channel: "bank_account", accountNumber: "0000000000", destinationCode: "033", verification: "sandbox_verified" });
    assert.throws(() => store.prepare("a", "owner", "request-small", recipient.id, "999.99", "Too small", "hash"), /1,000 NGN/);
    assert.equal(store.list("a").length, 0);
    assert.equal(store.prepare("a", "owner", "request-valid", recipient.id, "1000", "Valid minimum", "hash").amount, "1000.00");
  } finally { store.close(); }
});
test("Duplicate protection covers payouts older than the displayed history window", () => {
  const store = new FiatPayoutRepository(":memory:");
  try {
    store.saveRecipient("a", recipient);
    store.prepare("a", "owner", "original-request", recipient.id, "100", "Original unresolved payout", "hash");
    for (let index = 0; index < 101; index++) store.prepare("a", "owner", `new-request-${index}`, recipient.id, String(200 + index), `Distinct fixture ${index}`, "hash");
    assert.equal(store.list("a").length, 100);
    assert.throws(() => store.prepare("a", "owner", "duplicate-request", recipient.id, "100", "Original unresolved payout", "hash"), /identical/);
  } finally { store.close(); }
});
test("Timeouts persist across restart and cannot resend; status query recovers the original reference", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fiat-payout-")); const path = join(dir, "test.sqlite");
  const originalFetch = globalThis.fetch; const originalKey = process.env.SETTLBOX_KORA_FIXTURE_KEY;
  process.env.SETTLBOX_KORA_FIXTURE_KEY = "sk_test_fixture"; let store = new FiatPayoutRepository(path); let posts = 0;
  try {
    store.saveRecipient("a", recipient); const payout = store.prepare("a", "owner", "request-1", recipient.id, "100", "Timeout recovery", credentialHash("SETTLBOX_KORA_FIXTURE_KEY"));
    globalThis.fetch = async () => { posts++; throw new Error("timeout after acceptance"); };
    assert.equal((await submitFiatPayout(store, "a", "owner", "SETTLBOX_KORA_FIXTURE_KEY", payout.id)).status, "uncertain");
    store.close(); store = new FiatPayoutRepository(path);
    await assert.rejects(submitFiatPayout(store, "a", "owner", "SETTLBOX_KORA_FIXTURE_KEY", payout.id), /already/); assert.equal(posts, 1);
    globalThis.fetch = async (url, options) => { assert.equal(options.method, "GET"); assert.ok(url.endsWith(`/transactions/${payout.reference}`)); return Response.json({ status: true, data: { reference: payout.reference, amount: "100.00", currency: "KES", status: "success", fee: "5.00" } }); };
    const result = await refreshFiatPayout(store, "a", "owner", "SETTLBOX_KORA_FIXTURE_KEY", payout.id); assert.equal(result.status, "sandbox_success");
    assert.equal(store.events("b").length, 0); assert.equal(store.events("a").length, 4);
  } finally { store.close(); globalThis.fetch = originalFetch; if (originalKey === undefined) delete process.env.SETTLBOX_KORA_FIXTURE_KEY; else process.env.SETTLBOX_KORA_FIXTURE_KEY = originalKey; rmSync(dir, { recursive: true, force: true }); }
});
