import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectWorkspaceSettlement } from "../services/server/workspace-settlement.ts";

test("workspace invoice and bill histories follow canonical settlement, never submission hashes", () => {
  const data = JSON.parse(readFileSync("public/demo-data-entity-3.json", "utf8"));
  const address = "0x1111111111111111111111111111111111111111";
  const record = { id: "payment", companyId: "company", kind: "payroll", title: "Payroll", counterparty: "Contractor", recipient: address, amount: "0.001", dueDate: "2026-10-31", description: "Delivery", status: "submitted", transactionHash: `0x${"1".repeat(64)}`, paymentLinkCode: null, createdAt: "2026-10-09T00:00:00Z", updatedAt: "2026-10-09T00:00:00Z" };
  data.invoices.push({ uuid: "new-invoice", payrollContractId: 1, businessRecordId: record.id, status: "CONFIRMED", paidAt: null });
  data.bills.push({ uuid: "new-bill", businessRecordId: record.id, status: "PENDING", paidAt: null });
  const pending = projectWorkspaceSettlement(data, [record], address);
  assert.equal(pending.invoices.at(-1).status, "SUBMITTED");
  assert.equal(pending.bills.at(-1).status, "SUBMITTED");
  assert.equal(pending.transactions.some(transaction => transaction.id === record.id), false);
  const paid = projectWorkspaceSettlement(data, [{ ...record, status: "paid" }], address);
  assert.equal(paid.invoices.at(-1).status, "PAID");
  assert.equal(paid.bills.at(-1).status, "PAID");
  assert.equal(paid.transactions.filter(transaction => transaction.id === record.id).length, 1);
  const repeated = projectWorkspaceSettlement(paid, [{ ...record, status: "paid" }], address);
  assert.deepEqual(repeated.transactions, paid.transactions);
  assert.equal(repeated.invoices[0].status, data.invoices[0].status);
});
