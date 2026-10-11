import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { renderWorkspacePdf } from "../services/server/workspace-pdf.ts";
import { formatInvoiceAmount, formatInvoiceDate } from "../types/invoice-format.ts";

test("invoice date formatting preserves unambiguous issue and due dates",()=>{
  assert.equal(formatInvoiceDate("2026-10-11T13:00:00.000Z"),"11.10.2026");
  assert.equal(formatInvoiceDate("2026-11-10T13:00:00.000Z"),"10.11.2026");
  assert.equal(formatInvoiceDate("2026-10-31"),"31.10.2026");
});

test("invoice amounts preserve USDC precision", () => {
  assert.equal(formatInvoiceAmount("0.001"), "0.001");
  assert.equal(formatInvoiceAmount("0.000001"), "0.000001");
  assert.equal(formatInvoiceAmount("18500"), "18,500.00");
});

test("workspace downloads are readable PDF documents and paginate long invoice items", async () => {
  const data = JSON.parse(readFileSync("public/demo-data-entity-3.json", "utf8"));
  const invoice = data.invoices[0];
  invoice.items = Array.from({ length: 50 }, (_, index) => ({ description: `Deliverable ${index + 1} ${"Long item details ".repeat(8)}`, quantity: 1, unitPrice: 0.001 }));
  const bytes = await renderWorkspacePdf(data, invoice.uuid);
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getTitle(), invoice.invoiceNumber);
  assert.ok(document.getPageCount() > 1);
  assert.ok(document.getPages().every(page => page.getWidth() > 500));
  await assert.rejects(() => renderWorkspacePdf(data, "missing"), /not found/);
});
