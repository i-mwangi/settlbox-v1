"use client";

import { useWorkspaceMutation, useWorkspaceRecords } from "./workspace";
import type { ClientQueryParams, ClientResponseDto, CreateClientDto, UpdateClientDto } from "@/types/dto/client";

export function useGetClients(params?: ClientQueryParams, options?: { enabled?: boolean }) {
  const query = useWorkspaceRecords<ClientResponseDto>("clients", options?.enabled);
  const page = params?.page || 1;
  const limit = params?.limit || 1000;
  const search = params?.search?.toLowerCase() || "";
  const clients = (query.data || []).filter(client => `${client.companyName} ${client.email}`.toLowerCase().includes(search));
  return { ...query, data: { data: clients.slice((page - 1) * limit, page * limit), pagination: { total: clients.length, page, limit, totalPages: Math.ceil(clients.length / limit) } } };
}
export function useGetClientById(uuid?: string, options?: { enabled?: boolean }) { const query = useWorkspaceRecords<ClientResponseDto>("clients", options?.enabled); return { ...query, data: query.data?.find(client => client.uuid === uuid) }; }
export function useCreateClient() { return useWorkspaceMutation<ClientResponseDto, CreateClientDto>("clients", "POST"); }
export function useUpdateClient() {
  const mutation = useWorkspaceMutation<ClientResponseDto, { id: string; data: UpdateClientDto }>("clients", "PATCH");
  return { ...mutation, mutateAsync: (input: { uuid: string; data: UpdateClientDto }) => mutation.mutateAsync({ id: input.uuid, data: input.data }), mutate: (input: { uuid: string; data: UpdateClientDto }, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => mutation.mutate({ id: input.uuid, data: input.data }, options) };
}
export function useDeleteClient() {
  const mutation = useWorkspaceMutation<{ deleted: number }, { ids: string[] }>("clients", "DELETE");
  return { ...mutation, mutateAsync: (uuid: string) => mutation.mutateAsync({ ids: [uuid] }), mutate: (uuid: string, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => mutation.mutate({ ids: [uuid] }, options) };
}
