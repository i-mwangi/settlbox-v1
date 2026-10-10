import { createHash } from "node:crypto";
import type { PaymentFrequency, PaymentScheduleInput } from "../../types/recurring-payment";
import type { BusinessRecordInput } from "../../types/business";

export function validateCalendarDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("A calendar date is required");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid calendar date");
  return value;
}

export function validatePaymentSchedule(value: unknown, validatePayment: (value: unknown) => BusinessRecordInput): PaymentScheduleInput {
  if (!value || typeof value !== "object" || !("frequency" in value) || !("payment" in value)) throw new Error("A frequency and payment are required");
  if (value.frequency !== "once" && value.frequency !== "daily" && value.frequency !== "weekly" && value.frequency !== "monthly" && value.frequency !== "yearly") throw new Error("Invalid payment frequency");
  const payment = validatePayment(value.payment);
  validateCalendarDate(payment.dueDate);
  if (payment.kind !== "bill" && payment.kind !== "payroll") throw new Error("Schedules support bills and payroll payments");
  const endDate = "endDate" in value && value.endDate !== null ? validateCalendarDate(value.endDate) : null;
  if (endDate && endDate < payment.dueDate) throw new Error("End date must follow the first payment date");
  return { frequency: value.frequency, payment, endDate };
}

export function nextPaymentDate(current: string, frequency: Exclude<PaymentFrequency, "once">, startDate: string): string {
  const date = new Date(`${validateCalendarDate(current)}T00:00:00Z`);
  const anchor = new Date(`${validateCalendarDate(startDate)}T00:00:00Z`);
  if (frequency === "daily" || frequency === "weekly") date.setUTCDate(date.getUTCDate() + (frequency === "daily" ? 1 : 7));
  else {
    date.setUTCDate(1);
    if (frequency === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
    else date.setUTCFullYear(date.getUTCFullYear() + 1);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  }
  return date.toISOString().slice(0, 10);
}

export function scheduledRecordId(scheduleId: string, date: string): string {
  const hex = createHash("sha256").update(`${scheduleId}:${date}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
