import type { EvmAddress, PaymentStatus, TransactionHash } from "./finance";

export type BusinessRecordKind = "invoice" | "bill" | "payroll" | "reimbursement";
export type BusinessRecordStatus = "draft" | "issued" | "cancelled" | "paid" | PaymentStatus;

export interface BusinessRecordInput {
  kind: BusinessRecordKind;
  title: string;
  counterparty: string;
  recipient: EvmAddress;
  amount: string;
  dueDate: string;
  description: string;
  receiptUrls?: string[];
}

export interface BusinessRecord extends BusinessRecordInput {
  scheduleId?: string;
  id: string;
  companyId: string;
  status: BusinessRecordStatus;
  paymentLinkCode: string | null;
  transactionHash: TransactionHash | null;
  createdAt: string;
  updatedAt: string;
}
