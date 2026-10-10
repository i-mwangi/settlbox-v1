import type { BusinessRecord } from "../../types/business";
import { defaultInvoicePresentation, validateInvoicePresentation, type InvoicePresentation } from "../../types/invoice-presentation.ts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function renderBusinessDocument(record: BusinessRecord, companyName: string, settings = defaultInvoicePresentation): string {
  const presentation: InvoicePresentation = validateInvoicePresentation(settings);
  const entries = [
    ["Record", record.id], ["Type", record.kind], ["Status", record.status.replaceAll("_", " ")],
    ["Counterparty", record.counterparty], ["Amount", `${record.amount} USDC`], ["Due date", record.dueDate],
    [record.kind === "invoice" ? "Collection wallet" : "Recipient wallet", record.recipient],
    ["Network", "Arc Testnet"], ["Transaction", record.transactionHash || "No confirmed settlement"],
    ["Created", record.createdAt], ["Updated", record.updatedAt],
    ...(record.kind === "invoice" && presentation.showTaxId && presentation.companyTaxId ? [["Company tax identifier", presentation.companyTaxId]] : []),
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(record.title)} · Settlbox</title><style>body{font:16px/1.6 system-ui,sans-serif;margin:40px auto;padding:0 24px;max-width:860px;color:#182238}header{border-bottom:2px solid ${presentation.accentColor};margin-bottom:24px}h1{line-height:1.2}dt{font-weight:600}dd{margin:0 0 16px;overflow-wrap:anywhere}p{white-space:pre-wrap}footer{border-top:1px solid #ddd;padding-top:16px;font-size:13px;color:#555}@media print{body{margin:0;max-width:none}}</style></head><body><header><strong>Settlbox · ${escapeHtml(companyName)}</strong><h1>${escapeHtml(record.title)}</h1></header><dl>${entries.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl><h2>Description</h2><p>${escapeHtml(record.description)}</p><footer>${record.kind === "invoice" && presentation.footerText ? `<p>${escapeHtml(presentation.footerText)}</p>` : ""}Use your browser’s Print command to print this record or save it as a PDF. This document reflects the saved record; confirm current settlement status in Settlbox.</footer></body></html>`;
}

