import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { DemoClient } from "@/presentation/contexts/DemoProvider";
import type { CreateClientDto, UpdateClientDto, ClientQueryParams } from "@/presentation/types/dto/client";
import { modifyWorkspace, useRecordMutation } from "./record-mutation";

export function useGetClients(params?: ClientQueryParams, _options?: unknown) {
  const { data, isLoaded } = useDemo();
  const all = (data?.clients ?? []).map((client, index) => ({ ...client, id: index + 1 })).filter(client => !params?.search || `${client.companyName} ${client.email}`.toLowerCase().includes(params.search.toLowerCase()));
  const page = params?.page || 1;
  const limit = params?.limit || 1000;
  return { data: { data: all.slice((page - 1) * limit, page * limit), pagination: { total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) } }, isLoading: !isLoaded, isError: false, error: null, refetch: async () => window.dispatchEvent(new Event("settlbox-workspace-refresh")) };
}
export function useGetClientById(uuid?: string, _options?: unknown) {
  const { data, isLoaded } = useDemo();
  return { data: data?.clients.find(client => client.uuid === uuid), isLoading: !isLoaded, isError: false, error: null };
}
export function useCreateClient() {
  return useRecordMutation(async (input: CreateClientDto) => {
    const now = new Date().toISOString();
    const client: DemoClient = { ...input, uuid: crypto.randomUUID(), createdAt: now, updatedAt: now };
    await modifyWorkspace("clients", clients => [...clients, client]);
    return client;
  });
}
export function useUpdateClient() {
  return useRecordMutation(async (input: { uuid: string; data: UpdateClientDto }) => {
    let saved: DemoClient | undefined;
    await modifyWorkspace("clients", clients => {
      if (!clients.some(client => client.uuid === input.uuid)) throw new Error("Client not found");
      return clients.map(client => {
        if (client.uuid !== input.uuid) return client;
        saved = { ...client, ...input.data, updatedAt: new Date().toISOString() };
        return saved;
      });
    });
    return saved!;
  });
}
export function useDeleteClient() {
  return useRecordMutation(async (uuid: string) => {
    await modifyWorkspace("clients", clients => {
      if (!clients.some(client => client.uuid === uuid)) throw new Error("Client not found");
      return clients.filter(client => client.uuid !== uuid);
    });
    return { uuid };
  });
}
