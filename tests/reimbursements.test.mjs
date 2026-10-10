import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReimbursementRepository, validateReimbursement } from "../services/server/reimbursements.ts";

const expense = { id: "ce9d835e-86a8-470a-bebf-cc81f497553c", employeeName: "Test employee", recipient: "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5", description: "Test expense", amountExact: "0.001", currency: "USDC", category: "Other", date: "2026-10-10", receiptUrl: null, receiptName: null };

test("expenses persist, isolate companies and entities, and reject conflicting retries", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-expenses-"));
  const file = join(directory, "records.sqlite");
  let repository = new ReimbursementRepository(file);
  try {
    const row = repository.create("company-a", "entity-3", expense);
    assert.equal(repository.create("company-a", "entity-3", expense).id, row.id);
    assert.equal(repository.list("company-b", "entity-3").length, 0);
    assert.equal(repository.list("company-a", "primary").length, 0);
    assert.throws(() => repository.create("company-a", "entity-3", { ...expense, amountExact: "1" }));
    repository.close();
    repository = new ReimbursementRepository(file);
    assert.equal(repository.get("company-a", "entity-3", row.id).amountExact, "0.001");
    const approved = { ...row, status: "approved" };
    repository.update("company-a", "entity-3", row.id, row, approved);
    assert.throws(() => repository.update("company-a", "entity-3", row.id, row, { ...row, status: "rejected" }));
    repository.seed("company-a", "entity-3", [row]);
    assert.equal(repository.get("company-a", "entity-3", row.id).status, "approved");
  } finally { repository.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("expense validation rejects invented receipt paths, unsupported precision and invalid recipients", () => {
  assert.throws(() => validateReimbursement({ ...expense, receiptUrl: "blob:temporary" }));
  assert.throws(() => validateReimbursement({ ...expense, amountExact: "0.0000001" }));
  assert.throws(() => validateReimbursement({ ...expense, recipient: "0x0000000000000000000000000000000000000000" }));
  assert.throws(() => validateReimbursement({ ...expense, currency: "BOX" }));
  assert.equal(validateReimbursement({ ...expense, status: "paid", historical: true }).status, "pending");
});
