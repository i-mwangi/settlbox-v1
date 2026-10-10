import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PaymentLinkRepository, validatePaymentLink, verifyLinkSettlement } from "../services/server/payment-links.ts";

const details = { title: "Consulting", description: "Monthly invoice", amount: "0.001", paymentWalletAddress: `0x${"1".repeat(40)}` };
const payer = `0x${"2".repeat(40)}`;
const hash = `0x${"a".repeat(64)}`;

test("payment links and verified receipts survive restart without duplicate settlement", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-links-"));
  const path = join(directory, "business.sqlite");
  let repository = new PaymentLinkRepository(path);
  try {
    const first = repository.create(details);
    const second = repository.create(details);
    repository.record(first.code, hash, payer, first.amount);
    repository.close();
    repository = new PaymentLinkRepository(path);
    assert.equal(repository.record(first.code, hash, payer, first.amount).records.length, 1);
    assert.throws(() => repository.record(second.code, hash, payer, second.amount), /another payment link/);
    assert.throws(() => repository.update(first.code, { amount: "2" }), /cannot be changed/);
    assert.throws(() => repository.delete([first.code]), /history/);
    assert.equal(repository.get(first.code).records.length, 1);
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});

test("settlement rejects stale, failed, misdirected, and underpaid transactions", () => {
  const link = { ...details, createdAt: "2026-10-08T12:00:00Z" };
  const timestamp = BigInt(Date.parse(link.createdAt) / 1000);
  const transaction = { to: details.paymentWalletAddress, value: 1000000000000000n };
  verifyLinkSettlement(link, transaction, { status: "success" }, timestamp);
  assert.throws(() => verifyLinkSettlement(link, transaction, { status: "reverted" }, timestamp));
  assert.throws(() => verifyLinkSettlement(link, { ...transaction, to: payer }, { status: "success" }, timestamp));
  assert.throws(() => verifyLinkSettlement(link, { ...transaction, value: 1n }, { status: "success" }, timestamp));
  assert.throws(() => verifyLinkSettlement(link, transaction, { status: "success" }, timestamp - 1n), /predates/);
});

test("payment link validation rejects invalid recipients and nonpositive amounts", () => {
  assert.throws(() => validatePaymentLink({ ...details, paymentWalletAddress: "0x1234" }));
  assert.throws(() => validatePaymentLink({ ...details, amount: "0" }));
  assert.throws(() => validatePaymentLink({ ...details, amount: "NaN" }));
  assert.throws(() => validatePaymentLink({ ...details, paymentWalletAddress: `0x${"0".repeat(40)}` }));
});

test("inactive or changed links cannot accept a newly verified receipt", () => {
  const repository = new PaymentLinkRepository(":memory:");
  try {
    const link = repository.create(details);
    repository.update(link.code, { amount: "3" });
    assert.throws(() => repository.record(link.code, hash, payer, link.amount), /changed/);
    repository.update(link.code, { status: "DEACTIVATED" });
    assert.throws(() => repository.record(link.code, hash, payer, "3"), /inactive/);
    assert.equal(repository.get(link.code).records.length, 0);
  } finally { repository.close(); }
});
