"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceNotification } from "@/services/server/notifications";
import { PaymentLinkRequestError } from "./payment-link";

async function request<T>(body?: unknown): Promise<T> {
  const response = await fetch("/api/notifications", { method: body === undefined ? "GET" : "PATCH", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!response.ok) throw new PaymentLinkRequestError(response.status === 401 ? "Operator sign-in is required" : "Notification request failed", response.status);
  return response.json();
}
export function useNotifications(enabled: boolean) {
  return useQuery({ queryKey: ["notifications"], queryFn: () => request<WorkspaceNotification[]>(), enabled, refetchInterval: enabled ? 30000 : false, retry: (attempt, error) => !(error instanceof PaymentLinkRequestError && error.status === 401) && attempt < 2 });
}
export function useReadNotifications() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id?: number) => request(id === undefined ? { action: "readAll" } : { action: "read", id }), onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }) });
}
