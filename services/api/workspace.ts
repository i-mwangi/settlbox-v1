"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceResource } from "@/types/workspace";

export async function workspaceRequest<T>(resource: WorkspaceResource, method = "GET", input?: unknown): Promise<T> {
  const response = await fetch(`/api/workspace/${resource}`, { method, headers: input === undefined ? undefined : { "Content-Type": "application/json" }, body: input === undefined ? undefined : JSON.stringify(input) });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error(value && typeof value === "object" && "error" in value ? String(value.error) : "Workspace request failed");
  return value as T;
}

export function useWorkspaceRecords<T>(resource: WorkspaceResource, enabled = true) {
  return useQuery({ queryKey: ["workspace", resource], enabled, queryFn: () => workspaceRequest<T[]>(resource), retry: false });
}

export function useWorkspaceMutation<T, Input>(resource: WorkspaceResource, method: "POST" | "PATCH" | "DELETE") {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: Input) => workspaceRequest<T>(resource, method, input), onSuccess: () => client.invalidateQueries({ queryKey: ["workspace"] }) });
}
