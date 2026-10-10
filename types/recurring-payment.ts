import type { BusinessRecordInput } from "./business";

export type PaymentFrequency = "once" | "daily" | "weekly" | "monthly" | "yearly";
export type ScheduleStatus = "active" | "paused" | "cancelled" | "completed";

export interface PaymentScheduleInput {
  frequency: PaymentFrequency;
  payment: BusinessRecordInput;
  endDate: string | null;
}

export interface PaymentSchedule extends PaymentScheduleInput {
  id: string;
  companyId: string;
  nextDueDate: string;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
}
