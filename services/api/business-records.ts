"use client";

import { useQuery } from "@tanstack/react-query";
import type { BusinessRecord } from "@/types/business";
import { PaymentLinkRequestError } from "./payment-link";

export function useBusinessRecords() {
  return useQuery({ queryKey: ["business-records"], queryFn: async (): Promise<BusinessRecord[]> => {
    const response = await fetch("/api/business-records");
    if (!response.ok) throw new PaymentLinkRequestError(response.status === 401 ? "Operator sign-in is required" : "Business records are unavailable", response.status);
    return response.json();
  }, retry: (attempt, error) => !(error instanceof PaymentLinkRequestError && error.status === 401) && attempt < 2 });
}
