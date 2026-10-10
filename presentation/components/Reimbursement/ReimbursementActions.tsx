"use client";
import toast from "react-hot-toast";
import type { Reimbursement, ReimbursementOperation } from "@/types/reimbursement";

export function ReimbursementActions({ record, busy, execute }: { record: Reimbursement; busy: boolean; execute: (operation: ReimbursementOperation, id: string) => Promise<Reimbursement> }) {
  if (record.historical) return <span className="text-text-secondary text-xs">History</span>;
  const operations: ReimbursementOperation[] = record.status === "pending" ? ["approve", "reject"] : record.status === "approved" ? ["pay"] : record.status === "awaiting_approval" ? ["authorize", "refresh"] : record.businessRecordId ? ["refresh"] : [];
  async function run(operation: ReimbursementOperation) {
    try { const result = await execute(operation, record.id); toast.success(`Expense status: ${result.status}`); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Action failed"); }
  }
  return <div className="flex gap-2">{operations.map(operation => <button key={operation} disabled={busy} onClick={() => { void run(operation); }}>{operation}</button>)}{record.transactionHash && <a href={`https://explorer.testnet.arc.io/tx/${record.transactionHash}`} target="_blank" rel="noreferrer">Explorer</a>}</div>;
}
