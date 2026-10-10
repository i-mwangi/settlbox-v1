"use client";

import Link from "next/link";
import type { ModalProp } from "@/contexts/ModalManagerProvider";
import type { RecurringTransferModalProps } from "@/types/modal";
import { usePaymentSchedules } from "@/services/api/payment-schedules";
import BaseModal from "../BaseModal";

export function RecurringTransferModal({ isOpen, onClose, zIndex }: ModalProp<RecurringTransferModalProps>) {
  const query = usePaymentSchedules();
  return <BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex} title="Recurring payments"><div className="max-w-lg space-y-4 p-5 text-text-primary">{query.isLoading && <p>Loading schedules…</p>}{query.error && <p role="alert">Schedules could not be loaded.</p>}{query.data?.slice(0, 5).map(schedule => <p key={schedule.id}>{schedule.payment.title} · {schedule.payment.amount} USDC · {schedule.frequency} · {schedule.status}</p>)}{!query.isLoading && !query.error && !query.data?.length && <p>No recurring schedules yet.</p>}<Link href="/dashboard/schedule-payment" onClick={onClose} className="block text-primary-blue">Manage scheduled payments</Link></div></BaseModal>;
}

export default RecurringTransferModal;
