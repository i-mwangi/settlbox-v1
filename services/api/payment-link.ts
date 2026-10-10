"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatePaymentLinkDto, UpdatePaymentLinkDto } from "@/types/dto/payment-link";
import type { BusinessPaymentLink } from "@/services/server/payment-links";

export class PaymentLinkRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/payment-links${path}`, {
    method, headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new PaymentLinkRequestError(typeof result === "object" && result !== null && "error" in result && typeof result.error === "string" ? result.error : "Payment link request failed", response.status);
  return result as T;
}

export function useGetPaymentLinks() {
  return useQuery({ queryKey: ["payment-links"], queryFn: () => request<BusinessPaymentLink[]>(""), retry: (attempt, error) => !(error instanceof PaymentLinkRequestError && error.status === 401) && attempt < 2 });
}

export function useGetPaymentLinkByCode(code?: string) {
  return useQuery({ queryKey: ["payment-links", code], enabled: !!code, queryFn: () => request<BusinessPaymentLink>(`/${encodeURIComponent(code!)}`) });
}

export function useGetPaymentLinkByCodeForOwner(code?: string) {
  const links = useGetPaymentLinks();
  return { ...links, data: links.data?.find(link => link.code === code) };
}

function useLinkMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: ["payment-links"] }) });
}

export function useCreatePaymentLink() {
  return useLinkMutation((input: CreatePaymentLinkDto) => request<BusinessPaymentLink>("", "POST", input));
}

export function useUpdatePaymentLink() {
  return useLinkMutation((input: { code: string; data: UpdatePaymentLinkDto }) => request<BusinessPaymentLink>(`/${encodeURIComponent(input.code)}`, "PATCH", input.data));
}

export function useDeactivatePaymentLink() {
  return useLinkMutation((code: string) => request<BusinessPaymentLink>(`/${encodeURIComponent(code)}`, "PATCH", { status: "DEACTIVATED" }));
}

export function useActivatePaymentLink() {
  return useLinkMutation((code: string) => request<BusinessPaymentLink>(`/${encodeURIComponent(code)}`, "PATCH", { status: "ACTIVE" }));
}

export function useDeletePaymentLinks() {
  return useLinkMutation((codes: string[]) => request<{ message: string; deletedCount: number }>("", "DELETE", codes));
}

export function useUpdatePaymentLinkOrder() {
  return useLinkMutation((input: { linkIds: number[] }) => request<{ message: string }>("", "PATCH", input));
}

export function useRecordPayment() {
  return useLinkMutation((input: { code: string; data: { txid: string } }) => request<{ status: "confirmed"; transactionHash: string }>(`/${encodeURIComponent(input.code)}/payments`, "POST", input.data));
}

export const useUpdatePaymentTxid = useRecordPayment;
export { useGetPaymentLinks as default };
