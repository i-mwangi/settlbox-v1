"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceMutation, useWorkspaceRecords } from "./workspace";
import type { Group, CreateGroupDto } from "@/types/group-payment";
import type { GroupCollection } from "@/types/collections";

export function useGetAllGroups() { return useWorkspaceRecords<Group>("payment-groups"); }
export function useCreateGroup() { return useWorkspaceMutation<Group, CreateGroupDto>("payment-groups", "POST"); }
export function useUpdateGroup() { const mutation = useWorkspaceMutation<Group, { id: number; data: CreateGroupDto }>("payment-groups", "PATCH"); return { ...mutation, mutateAsync: (input: { groupId: number; data: CreateGroupDto }) => mutation.mutateAsync({ id: input.groupId, data: input.data }) }; }
export function useDeleteGroup() { const mutation = useWorkspaceMutation<{ deleted: number }, { ids: number[] }>("payment-groups", "DELETE"); return { ...mutation, mutateAsync: (id: number) => mutation.mutateAsync({ ids: [id] }) }; }
async function collectionRequest<T>(method = "GET", input?: unknown): Promise<T> {
  const response = await fetch("/api/group-collections", { method, headers: { "Content-Type": "application/json" }, body: input === undefined ? undefined : JSON.stringify(input) });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error(value && typeof value === "object" && "error" in value ? String(value.error) : "Collection request failed");
  return value as T;
}
export function useGetGroupPayments(groupId?: number) { const query = useQuery({ queryKey: ["group-collections"], queryFn: () => collectionRequest<GroupCollection[]>(), retry: false }); return { ...query, data: { payments: (query.data || []).filter(record => !groupId || record.groupId === groupId) } }; }
export function useCreateGroupPayment() { const client = useQueryClient(); return useMutation({ mutationFn: (input: { id: string; title: string; amount: string; groupId: number | null; memberCount: number }) => collectionRequest<GroupCollection>("POST", input), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["group-collections"] }); await client.invalidateQueries({ queryKey: ["payment-links"] }); } }); }
