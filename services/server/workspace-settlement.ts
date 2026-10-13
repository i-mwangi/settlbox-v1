import type { DemoData, DemoTransaction, DemoInvoice, DemoBill } from "../../presentation/contexts/DemoProvider";
import type { BusinessRecord } from "../../types/business";

export function projectWorkspaceSettlement(data: DemoData, records: BusinessRecord[], treasuryAddress: string): DemoData {
  const indexed = new Map(records.map(record => [record.id, record]));
  const invoiceSources = [...data.invoices];
  const billSources = [...data.bills];
  for (const record of records) {
    const id = Number.parseInt(record.id.replaceAll("-", "").slice(0, 12), 16);
    if (record.kind === "invoice" && !invoiceSources.some(item => item.businessRecordId === record.id)) {
      invoiceSources.push({ id, uuid: record.id, businessRecordId: record.id, invoiceNumber: record.title, type: "SENT", status: record.status.toUpperCase(), amount: Number(record.amount), amountExact: record.amount, currency: "USDC", from: data.company.companyName, to: record.counterparty, toEmail: "", recipient: record.recipient, description: record.description, dueDate: record.dueDate, paidAt: null, createdAt: record.createdAt, items: [{ description: record.description || record.title, quantity: 1, unitPrice: Number(record.amount) }] } satisfies DemoInvoice);
    }
    if (["bill", "payroll"].includes(record.kind) && !billSources.some(item => item.businessRecordId === record.id)) {
      billSources.push({ id, uuid: record.id, businessRecordId: record.id, vendor: record.counterparty, description: record.description || record.title, amount: Number(record.amount), amountExact: record.amount, recipient: record.recipient, currency: "USDC", status: record.status.toUpperCase(), dueDate: record.dueDate, category: record.kind, recurring: false, frequency: null, createdAt: record.createdAt } satisfies DemoBill);
    }
  }
  const invoices = invoiceSources.map(invoice => {
    const record = invoice.businessRecordId ? indexed.get(invoice.businessRecordId) : undefined;
    if (!record) return invoice;
    return { ...invoice, amount: Number(record.amount), amountExact: record.amount, recipient: record.recipient, dueDate: record.dueDate, description: record.description, to: record.counterparty, paymentLinkCode: record.paymentLinkCode, status: record.status === "paid" ? "PAID" : record.status === "issued" ? "SENT" : record.status === "draft" && invoice.payrollContractId ? "CONFIRMED" : record.status.toUpperCase(), paidAt: record.status === "paid" ? record.updatedAt : null };
  });
  const bills = billSources.map(bill => {
    const record = bill.businessRecordId ? indexed.get(bill.businessRecordId) : undefined;
    if (!record) return bill;
    return { ...bill, amount: Number(record.amount), amountExact: record.amount, recipient: record.recipient, dueDate: record.dueDate, description: record.description, vendor: record.counterparty, status: record.status === "paid" ? "PAID" : record.status === "draft" ? "PENDING" : record.status.toUpperCase(), paidAt: record.status === "paid" ? record.updatedAt : null };
  });
  const settled: DemoTransaction[] = records.filter(record => record.status === "paid" && record.transactionHash).map(record => ({ id: record.id, type: record.kind === "invoice" ? "RECEIVE" : "SEND", status: "COMPLETED", amount: Number(record.amount), currency: "USDC", from: record.kind === "invoice" ? record.counterparty : data.company.companyName, fromAddress: record.kind === "invoice" ? "" : treasuryAddress, to: record.kind === "invoice" ? data.company.companyName : record.counterparty, toAddress: record.recipient, accountId: treasuryAddress, category: record.kind, label: record.title, txHash: record.transactionHash!, timestamp: record.updatedAt, note: record.description }));
  const canonicalIds = new Set(records.map(record => record.id));
  return { ...data, invoices, bills, transactions: [...settled, ...data.transactions.filter(transaction => !canonicalIds.has(transaction.id))].sort((left, right) => right.timestamp.localeCompare(left.timestamp)) };
}
