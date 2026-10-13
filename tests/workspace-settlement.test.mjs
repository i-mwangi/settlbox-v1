import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectWorkspaceSettlement } from "../services/server/workspace-settlement.ts";

test('chat-created canonical invoices and bills appear once and track later edits',()=>{
  const data=JSON.parse(readFileSync('public/demo-data-entity-3.json','utf8'));
  const base={id:'12345678-1234-4123-a123-123456789012',kind:'invoice',title:'Chat invoice',counterparty:'Client',recipient:'0x'+'1'.repeat(40),amount:'0.001',dueDate:'2026-11-12',description:'Work',status:'draft',createdAt:'2026-10-12T00:00:00Z',updatedAt:'2026-10-12T00:00:00Z',paymentLinkCode:null};
  const projected=projectWorkspaceSettlement(data,[base],base.recipient);
  assert.equal(projected.invoices.filter(row=>row.businessRecordId===base.id).length,1);
  const edited=projectWorkspaceSettlement(projected,[{...base,amount:'0.002',dueDate:'2026-12-12',status:'issued',paymentLinkCode:'checkout'}],base.recipient);
  const invoice=edited.invoices.find(row=>row.businessRecordId===base.id);
  assert.equal(invoice.amountExact,'0.002');assert.equal(invoice.dueDate,'2026-12-12');assert.equal(invoice.status,'SENT');assert.equal(invoice.paymentLinkCode,'checkout');
  assert.equal(edited.invoices.filter(row=>row.businessRecordId===base.id).length,1);
  const bill=projectWorkspaceSettlement(data,[{...base,kind:'bill'}],base.recipient).bills.find(row=>row.businessRecordId===base.id);
  assert.equal(bill.status,'PENDING');assert.equal(bill.recipient,base.recipient);
});

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
