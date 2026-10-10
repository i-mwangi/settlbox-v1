"use client";

import Link from "next/link";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { SchedulePaymentSidebarProps } from "@/types/modal";
import { useBusinessRecords } from "@/services/api/business-records";
import BaseModal from "@/components/Modal/BaseModal";

export function SchedulePaymentSidebar({ isOpen, onClose, zIndex, scheduleId }: ModalProp<SchedulePaymentSidebarProps>) {
  const query = useBusinessRecords();
  const records = (query.data || []).filter(record => record.scheduleId === scheduleId);
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex} title="Scheduled payment history"><div className="max-w-lg space-y-4 p-5 text-text-primary">
    {query.isLoading && <p>Loading payments…</p>}{query.error && <p role="alert">Payment history could not be loaded.</p>}
    {!query.isLoading && !query.error && !records.length && <p>No drafts have been prepared for this schedule yet.</p>}
    {records.map(record => <Link key={record.id} href={`/${record.kind}/detail?id=${record.id}`} onClick={onClose} className="block rounded-lg border border-primary-divider p-4">{record.dueDate} · {record.amount} USDC · {record.status.replaceAll("_", " ")}</Link>)}
  </div></BaseModal>;
}

export default SchedulePaymentSidebar;
