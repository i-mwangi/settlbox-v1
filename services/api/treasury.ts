"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApprovalPolicy, PaymentExecution, PaymentIntent, WalletReference } from "@/types/finance";
import { PaymentLinkRequestError } from "./payment-link";

export interface TreasuryView {
  wallet: WalletReference;
  balanceBaseUnits: string;
  policy: ApprovalPolicy;
  payments: { intent: PaymentIntent; execution: PaymentExecution }[];
}

async function request<T>(path: string, method = "GET"): Promise<T> {
  const response = await fetch(path, { method });
  const result: unknown = await response.json();
  if (!response.ok) throw new PaymentLinkRequestError(typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "Treasury request failed", response.status);
  return result as T;
}

export function useTreasury() {
  return useQuery({ queryKey: ["treasury"], queryFn: () => request<TreasuryView>("/api/treasury"), retry: (attempt, error) => !(error instanceof PaymentLinkRequestError && error.status === 401) && attempt < 2 });
}

export function useApproveTreasuryPayment() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => request(`/api/treasury/payments/${encodeURIComponent(id)}/approve`, "POST"), onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["treasury"] }), client.invalidateQueries({ queryKey: ["business-records"] })]);
  } });
}
