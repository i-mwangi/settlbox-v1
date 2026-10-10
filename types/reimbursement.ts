export type ReimbursementStatus = "pending" | "approved" | "awaiting_approval" | "processing" | "paid" | "rejected" | "failed";

export interface Reimbursement {
  id: string;
  employeeName: string;
  recipient: string;
  description: string;
  amount: number;
  amountExact: string;
  currency: "USDC";
  category: string;
  date: string;
  status: ReimbursementStatus;
  receiptUrl: string | null;
  receiptName: string | null;
  historical: boolean;
  businessRecordId: string | null;
  transactionHash: string | null;
  approvalNote?: string;
  settledAt?: string;
}

export type ReimbursementOperation = "approve" | "reject" | "pay" | "refresh" | "authorize";
