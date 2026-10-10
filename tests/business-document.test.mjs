import test from "node:test";
import assert from "node:assert/strict";
import { renderBusinessDocument } from "../services/server/business-document.ts";
import { validateBusinessRecord } from "../services/server/business-records.ts";

test("printable records preserve exact amounts and escape stored user content", () => {
  const record = { id: "record", kind: "invoice", title: '<script>alert("x")</script>', counterparty: "Customer & Co", amount: "0.000000000000000001", dueDate: "2026-10-09", recipient: `0x${"1".repeat(40)}`, description: "Service <details>\nSecond line", status: "issued", transactionHash: null, createdAt: "2026-10-08", updatedAt: "2026-10-08" };
  const html = renderBusinessDocument(record, "A&B");
  assert.ok(html.includes("0.000000000000000001 USDC"));
  assert.ok(html.includes("A&amp;B"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("No confirmed settlement"));
});

test("reimbursements accept only bounded private receipt references", () => {
  const input = { kind: "reimbursement", title: "Travel", counterparty: "Employee", amount: "0.001", dueDate: "2026-10-09", recipient: `0x${"1".repeat(40)}`, description: "Travel expenses", receiptUrls: ["/api/uploads/12345678-1234-1234-1234-123456789abc.png"] };
  assert.deepEqual(validateBusinessRecord(input).receiptUrls, input.receiptUrls);
  assert.throws(() => validateBusinessRecord({ ...input, receiptUrls: ["https://external.example/receipt.png"] }), /receipt/);
  assert.throws(() => validateBusinessRecord({ ...input, receiptUrls: Array(6).fill(input.receiptUrls[0]) }), /receipt/);
  assert.throws(() => validateBusinessRecord({ ...input, receiptUrls: ["/api/uploads/../../secret.png"] }), /receipt/);
});

test("invoice presentation changes the printed document without allowing markup or CSS injection", () => {
  const record = { id: "record", kind: "invoice", title: "Invoice", counterparty: "Customer", amount: "0.001", dueDate: "2026-10-09", recipient: `0x${"1".repeat(40)}`, description: "Services", status: "issued", transactionHash: null, createdAt: "2026-10-09", updatedAt: "2026-10-09" };
  const settings = { accentColor: "#123456", footerText: "<script>bad()</script>", companyTaxId: "A&B", showTaxId: true };
  const html = renderBusinessDocument(record, "Company", settings);
  assert.ok(html.includes("border-bottom:2px solid #123456"));
  assert.ok(html.includes("Company tax identifier"));
  assert.ok(html.includes("A&amp;B"));
  assert.ok(html.includes("&lt;script&gt;bad()&lt;/script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.throws(() => renderBusinessDocument(record, "Company", { ...settings, accentColor: "red;display:none" }));
});
