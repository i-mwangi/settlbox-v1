"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentSchedule, PaymentScheduleInput, ScheduleStatus } from "@/types/recurring-payment";
import type { BusinessRecord } from "@/types/business";

export class ScheduleRequestError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

async function scheduleRequest<T>(method = "GET", input?: unknown): Promise<T> {
  const response = await fetch("/api/payment-schedules", { method, headers: { "Content-Type": "application/json" }, body: input === undefined ? undefined : JSON.stringify(input) });
  const result: unknown = await response.json();
  if (!response.ok) throw new ScheduleRequestError(result && typeof result === "object" && "error" in result ? String(result.error) : "Schedule request failed", response.status);
  return result as T;
}

export function usePaymentSchedules() {
  return useQuery({ queryKey: ["payment-schedules"], queryFn: () => scheduleRequest<PaymentSchedule[]>(), retry: false });
}

function useScheduleMutation<T, Input>(method: string, transform: (input: Input) => unknown) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: Input) => scheduleRequest<T>(method, transform(input)), onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["payment-schedules"] }), client.invalidateQueries({ queryKey: ["business-records"] })]);
  } });
}

export function useCreatePaymentSchedule() { return useScheduleMutation<PaymentSchedule, PaymentScheduleInput & { id: string }>("POST", input => input); }
export function useSetPaymentScheduleStatus() { return useScheduleMutation<PaymentSchedule, { id: string; status: ScheduleStatus }>("PATCH", input => input); }
export function usePrepareScheduledPayments() { return useScheduleMutation<BusinessRecord[], void>("POST", () => ({ action: "prepare" })); }
