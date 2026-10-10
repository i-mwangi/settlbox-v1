"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceRecords, workspaceRequest } from "./workspace";
import type { WorkspaceProfile } from "@/types/workspace";

export function useGetMyCompany(options?: { enabled?: boolean }) { const query = useWorkspaceRecords<WorkspaceProfile>("company", options?.enabled); return { ...query, data: query.data?.[0] }; }
export function useCreateCompany() { const client = useQueryClient(); return useMutation({ mutationFn: (input: unknown) => workspaceRequest<WorkspaceProfile>("company", "POST", input), onSuccess: () => client.invalidateQueries({ queryKey: ["workspace", "company"] }) }); }
export function useUpdateCompany() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (input: unknown) => { const profiles = await workspaceRequest<WorkspaceProfile[]>("company"); return profiles[0] ? workspaceRequest<WorkspaceProfile>("company", "PATCH", { id: profiles[0].id, data: input }) : workspaceRequest<WorkspaceProfile>("company", "POST", input); }, onSuccess: () => client.invalidateQueries({ queryKey: ["workspace", "company"] }) });
}
export function useDeleteCompany() { return useMutation({ mutationFn: () => workspaceRequest("company", "DELETE", { ids: [] }) }); }
