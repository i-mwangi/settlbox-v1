"use client";

import Link from "next/link";
import BaseModal from "../BaseModal";
import type { PayInvoiceConfirmModalProps } from "@/types/modal";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import { useBusinessRecords } from "@/services/api/business-records";
export function PayInvoiceConfirmModal({ isOpen, onClose, zIndex, billUUID, invoiceUUIDs }: ModalProp<PayInvoiceConfirmModalProps>) {
  const records = useBusinessRecords();
  const ids = billUUID ? [billUUID] : invoiceUUIDs;
  const bills = (records.data || []).filter(record => record.kind === "bill" && (!ids?.length || ids.includes(record.id)));
  if (!isOpen) return null;
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}><section className="space-y-4 rounded-xl bg-background p-6 text-text-primary"><h2 className="text-xl">Review bill payments</h2><p>Treasury approval and payment limits apply to each payment.</p>{records.error ? <p role="alert">{records.error.message}</p> : records.isLoading ? <p>Loading records…</p> : !bills.length ? <p>No matching saved bills. <Link href="/bill" onClick={onClose}>Open bills</Link></p> : bills.map(bill => <Link key={bill.id} href={`/bill/detail?id=${bill.id}`} onClick={onClose} className="block rounded-lg border p-3">{bill.title} · {bill.amount} USDC · {bill.status}</Link>)}</section></BaseModal>;
}
export default PayInvoiceConfirmModal;
