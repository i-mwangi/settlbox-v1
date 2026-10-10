import type { DemoData, DemoTransaction } from "../../presentation/contexts/DemoProvider";
import type { BusinessRecord } from "../../types/business";

export function projectWorkspaceSettlement(data: DemoData, records: BusinessRecord[], treasuryAddress: string): DemoData {
  const indexed = new Map(records.map(record => [record.id, record]));
  const invoices = data.invoices.map(invoice => {
    const record = invoice.businessRecordId ? indexed.get(invoice.businessRecordId) : undefined;
    if (!record) return invoice;
    return { ...invoice, status: record.status === "paid" ? "PAID" : record.status === "issued" ? "SENT" : record.status === "draft" && invoice.payrollContractId ? "CONFIRMED" : record.status.toUpperCase(), paidAt: record.status === "paid" ? record.updatedAt : null };
  });
  const bills = data.bills.map(bill => {
    const record = bill.businessRecordId ? indexed.get(bill.businessRecordId) : undefined;
    if (!record) return bill;
    return { ...bill, status: record.status === "paid" ? "PAID" : record.status === "draft" ? "PENDING" : record.status.toUpperCase(), paidAt: record.status === "paid" ? record.updatedAt : null };
  });
  const settled: DemoTransaction[] = records.filter(record => record.status === "paid" && record.transactionHash).map(record => ({ id: record.id, type: record.kind === "invoice" ? "RECEIVE" : "SEND", status: "COMPLETED", amount: Number(record.amount), currency: "USDC", from: record.kind === "invoice" ? record.counterparty : data.company.companyName, fromAddress: record.kind === "invoice" ? "" : treasuryAddress, to: record.kind === "invoice" ? data.company.companyName : record.counterparty, toAddress: record.recipient, accountId: treasuryAddress, category: record.kind, label: record.title, txHash: record.transactionHash!, timestamp: record.updatedAt, note: record.description }));
  const canonicalIds = new Set(records.map(record => record.id));
  return { ...data, invoices, bills, transactions: [...settled, ...data.transactions.filter(transaction => !canonicalIds.has(transaction.id))].sort((left, right) => right.timestamp.localeCompare(left.timestamp)) };
}
