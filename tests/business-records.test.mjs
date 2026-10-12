import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BusinessRecordRepository, validateBusinessRecord } from "../services/server/business-records.ts";
import { PaymentLinkRepository } from "../services/server/payment-links.ts";
import { reconcileInvoiceCollections } from "../services/server/invoice-reconciliation.ts";

const details = { kind: "invoice", title: "Consulting", counterparty: "Customer", recipient: `0x${"1".repeat(40)}`, amount: "0.001", dueDate: "2026-10-09", description: "Consulting services" };

test("batch drafts save atomically and retries preserve payment identities", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-batch-"));
  const repository = new BusinessRecordRepository(join(directory, "business.sqlite"));
  try {
    const id = randomUUID();
    const payments = [{ ...details, kind: "bill" }, { ...details, kind: "bill", amount: "0.000001" }];
    const records = repository.createBatch("company", id, payments);
    assert.equal(records.length, 2);
    assert.deepEqual(repository.createBatch("company", id, payments).map(record => record.id), records.map(record => record.id));
    assert.equal(repository.list("company").length, 2);
    assert.throws(() => repository.createBatch("company", id, [payments[0]]), /different request/);
    assert.throws(() => repository.createBatch("company", randomUUID(), [payments[0], { ...payments[1], amount: "0" }]));
    assert.equal(repository.list("company").length, 2);
    assert.deepEqual(repository.list("another"), []);
    repository.transition("company", records[0].id, "cancelled", ["draft"]);
    assert.equal(repository.createBatch("company", id, payments)[0].status, "cancelled");
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});

test("individual draft retries preserve identity and reject changed instructions", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-idempotency-"));
  const repository = new BusinessRecordRepository(join(directory, "business.sqlite"));
  try {
    const id = randomUUID();
    const first = repository.create("company", details, id);
    assert.deepEqual(repository.create("company", details, id), first);
    assert.equal(repository.list("company").length, 1);
    assert.throws(() => repository.create("company", { ...details, amount: "2" }, id), /different record/);
    assert.throws(() => repository.create("another", details, id), /different record/);
    assert.throws(() => repository.create("company", details, "invalid"), /request ID/);
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});

test("business drafts persist, remain company scoped, and freeze before execution", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-business-"));
  const path = join(directory, "business.sqlite");
  let repository = new BusinessRecordRepository(path);
  try {
    const draft = repository.create("company", details);
    assert.equal(repository.get("another", draft.id), undefined);
    assert.deepEqual(repository.list("another"), []);
    repository.updateDraft("company", draft.id, { ...details, amount: "1.000000000000000001" });
    repository.transition("company", draft.id, "processing", ["draft"]);
    assert.throws(() => repository.updateDraft("company", draft.id, details), /draft/);
    assert.throws(() => repository.cancel("company", draft.id), /unpaid/);
    repository.close();
    repository = new BusinessRecordRepository(path);
    assert.equal(repository.get("company", draft.id).amount, "1.000000000000000001");
    assert.equal(repository.get("company", draft.id).status, "processing");
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});

test("invoice issuance is idempotent and cancellation disables collection atomically", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-invoice-"));
  const path = join(directory, "business.sqlite");
  const repository = new BusinessRecordRepository(path);
  const links = new PaymentLinkRepository(path);
  try {
    const draft = repository.create("company", details);
    const input = { ...details, paymentWalletAddress: details.recipient };
    const link = links.create(input, draft.id);
    assert.equal(links.create(input, draft.id).code, link.code);
    assert.equal(links.list().length, 1);
    repository.transition("company", draft.id, "issued", ["draft"], { paymentLinkCode: link.code });
    assert.throws(() => links.update(link.code, { amount: "0.0001" }), /invoice/);
    assert.throws(() => links.delete([link.code]), /invoice/);
    repository.cancel("company", draft.id);
    assert.equal(links.get(link.code).status, "DEACTIVATED");
    assert.throws(() => links.record(link.code, `0x${"a".repeat(64)}`, details.recipient, details.amount), /inactive/);
  } finally { links.close(); repository.close(); rmSync(directory, { recursive: true }); }
});

test("verified settlement prevents cancellation of an issued invoice", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-settlement-"));
  const path = join(directory, "business.sqlite");
  const repository = new BusinessRecordRepository(path);
  const links = new PaymentLinkRepository(path);
  try {
    const draft = repository.create("company", details);
    const link = links.create({ ...details, paymentWalletAddress: details.recipient }, draft.id);
    repository.transition("company", draft.id, "issued", ["draft"], { paymentLinkCode: link.code });
    links.record(link.code, `0x${"b".repeat(64)}`, details.recipient, details.amount);
    assert.equal(links.get(link.code).status, "DEACTIVATED");
    assert.throws(() => links.record(link.code, `0x${"c".repeat(64)}`, details.recipient, details.amount), /inactive/);
    assert.equal(links.record(link.code, `0x${"b".repeat(64)}`, details.recipient, details.amount).records.length, 1);
    assert.throws(() => repository.cancel("company", draft.id), /settled/);
    assert.equal(repository.get("company", draft.id).status, "issued");
  } finally { links.close(); repository.close(); rmSync(directory, { recursive: true }); }
});

test("invoice collection reconciliation persists once and isolates companies", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-collection-"));
  const path = join(directory, "business.sqlite");
  let repository = new BusinessRecordRepository(path);
  const links = new PaymentLinkRepository(path);
  try {
    const draft = repository.create("company", details);
    const link = links.create({ ...details, paymentWalletAddress: details.recipient }, draft.id);
    repository.transition("company", draft.id, "issued", ["draft"], { paymentLinkCode: link.code });
    assert.equal(reconcileInvoiceCollections("company", repository, links)[0].status, "issued");
    links.record(link.code, `0x${"b".repeat(64)}`, details.recipient, details.amount);
    assert.deepEqual(reconcileInvoiceCollections("another", repository, links), []);
    assert.equal(repository.get("company", draft.id).status, "issued");
    const paid = reconcileInvoiceCollections("company", repository, links)[0];
    assert.equal(paid.status, "paid");
    assert.equal(paid.transactionHash, `0x${"b".repeat(64)}`);
    repository.close();
    repository = new BusinessRecordRepository(path);
    assert.deepEqual(reconcileInvoiceCollections("company", repository, links)[0], paid);
    assert.equal(links.get(link.code).records.length, 1);
  } finally { links.close(); repository.close(); rmSync(directory, { recursive: true }); }
});

test("business validation rejects invalid calendar dates and inexact amounts", () => {
  assert.throws(() => validateBusinessRecord({ ...details, dueDate: "2026-02-30" }), /due date/);
  assert.throws(() => validateBusinessRecord({ ...details, amount: "0" }));
  assert.throws(() => validateBusinessRecord({ ...details, amount: "0.0000000000000000001" }));
  assert.throws(() => validateBusinessRecord({ ...details, recipient: `0x${"0".repeat(40)}` }));
  assert.throws(() => validateBusinessRecord({ ...details, kind: "bill", amount: "0.0000001" }), /six decimal/);
  assert.equal(validateBusinessRecord({ ...details, kind: "payroll", amount: "0.000001000000000000" }).amount, "0.000001000000000000");
});
