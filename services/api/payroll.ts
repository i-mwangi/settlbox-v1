"use client";

import { useBusinessRecords } from "@/services/api/business-records";
import { useGetEmployeeById } from "@/services/api/employee";
export function useGetPayrollPendingReviews(id?: number) {
  const employee = useGetEmployeeById(id);
  const records = useBusinessRecords();
  const pending = (records.data || []).filter(record => record.kind === "payroll" && record.recipient.toLowerCase() === employee.data?.walletAddress.toLowerCase() && !["paid", "cancelled", "failed"].includes(record.status));
  return { ...records, data: { pending, pendingCount: pending.length, hasPendingReviews: pending.length > 0 }, isLoading: records.isLoading || employee.isLoading };
}
