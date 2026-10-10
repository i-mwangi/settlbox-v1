import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqlitePaymentRepository } from "../services/server/payment-repository.ts";
import { authorizePayment } from "../services/arc/policy.ts";

const recipient = `0x${"1".repeat(40)}`;
const account = {
  wallet: { id: "wallet", companyId: "company", address: recipient, chainId: 5042002 },
  balanceBaseUnits: "1000", gasReserveBaseUnits: "10",
  policy: { allowedRecipients: [recipient], maxPaymentBaseUnits: "1000", dailyLimitBaseUnits: "1000", approvalThresholdBaseUnits: "900", requiredApprovals: 2 },
};
const intent = { id: "one", companyId: "company", walletId: "wallet", recipient, amount: { symbol: "USDC", decimals: 18, baseUnits: "600" }, purpose: "bill", idempotencyKey: "one" };
const reserve = (repository, payment) => repository.reserveAuthorizedAtomically(payment, authorization => authorizePayment(payment, authorization));

test("reservations survive database restart and prevent duplicate execution", async () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-ledger-"));
  const path = join(directory, "treasury.sqlite");
  let repository = new SqlitePaymentRepository(path);
  try {
    repository.saveAccount(account);
    assert.equal((await reserve(repository, intent)).created, true);
    repository.close();
    repository = new SqlitePaymentRepository(path);
    assert.equal((await reserve(repository, intent)).created, false);
    assert.equal(repository.list("company").length, 1);
    assert.equal(repository.list("other-company").length, 0);
    await assert.rejects(reserve(repository, { ...intent, amount: { ...intent.amount, baseUnits: "500" } }), /Idempotency/);
    await assert.rejects(reserve(repository, { ...intent, walletId: "another-wallet" }), /Idempotency/);
  } finally {
    repository.close();
    rmSync(directory, { recursive: true });
  }
});

test("independent database connections cannot reserve the same funds twice", async () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-concurrency-"));
  const path = join(directory, "treasury.sqlite");
  const first = new SqlitePaymentRepository(path);
  const second = new SqlitePaymentRepository(path);
  try {
    first.saveAccount(account);
    const outcomes = await Promise.allSettled([
      reserve(first, intent), reserve(second, { ...intent, id: "two", idempotencyKey: "two" }),
    ]);
    assert.equal(outcomes.filter(result => result.status === "fulfilled").length, 1);
    assert.match(outcomes.find(result => result.status === "rejected").reason.message, /Insufficient/);
  } finally {
    first.close(); second.close(); rmSync(directory, { recursive: true });
  }
});

test("approval requests require distinct approvers before reserving funds", async () => {
  const repository = new SqlitePaymentRepository(":memory:");
  const payment = { ...intent, amount: { ...intent.amount, baseUnits: "950" } };
  try {
    repository.saveAccount(account);
    assert.equal((await reserve(repository, payment)).execution.status, "awaiting_approval");
    repository.approve(payment.id, payment.companyId, "approver-a");
    repository.approve(payment.id, payment.companyId, "approver-a");
    assert.equal((await reserve(repository, payment)).created, false);
    assert.throws(() => repository.approve(payment.id, "other-company", "approver-b"), /not found/);
    repository.approve(payment.id, payment.companyId, "approver-b");
    assert.equal((await reserve(repository, payment)).created, true);
  } finally { repository.close(); }
});

test("settlement verifies provider identity and cannot overwrite a terminal record", async () => {
  const repository = new SqlitePaymentRepository(":memory:");
  try {
    repository.saveAccount(account);
    await reserve(repository, intent);
    await repository.markSubmitted(intent.id, { paymentId: intent.id, status: "processing", providerTransactionId: "provider-one" });
    const settlement = { paymentId: intent.id, status: "confirmed", providerTransactionId: "provider-one", transactionHash: `0x${"a".repeat(64)}` };
    assert.throws(() => repository.recordSettlement("company", { ...settlement, providerTransactionId: "another-provider" }), /identity mismatch/);
    repository.recordSettlement("company", settlement);
    repository.recordSettlement("company", settlement);
    assert.throws(() => repository.recordSettlement("company", { ...settlement, status: "failed" }), /different settlement/);
    assert.equal(repository.list("company")[0].execution.status, "confirmed");
  } finally { repository.close(); }
});
