import type { DemoData } from "@/presentation/contexts/DemoProvider";
import type { SeededWorkspace, WorkspaceChange } from "@/types/seeded-workspace";

export async function workspaceFetch<T>(url: string, method = "GET", input?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", headers: input === undefined ? undefined : { "Content-Type": "application/json" }, body: input === undefined ? undefined : JSON.stringify(input) });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error(value && typeof value === "object" && "error" in value ? String(value.error) : "Workspace request failed");
  return value as T;
}
export function readWorkspace(entity = localStorage.getItem("settlbox_demo_entity") || "entity-3") {
  return workspaceFetch<SeededWorkspace>(`/api/seeded-workspace?entity=${encodeURIComponent(entity)}`);
}
export async function saveWorkspaceFields(changes: WorkspaceChange[], previous?: SeededWorkspace) {
  const current = previous || await readWorkspace();
  return workspaceFetch<SeededWorkspace>("/api/seeded-workspace", "PATCH", { entity: current.entityId, revision: current.revision, changes });
}
export async function workspaceAction(field: "invoices" | "bills" | "payrolls" | "pendingProposals", id: string, action: "pay" | "issue" | "refresh" | "cancel", recipient?: string) {
  const entity = localStorage.getItem("settlbox_demo_entity") || "entity-3";
  const result = await workspaceFetch<SeededWorkspace>("/api/seeded-workspace/action", "POST", { entity, field, id, action, recipient });
  window.dispatchEvent(new Event("settlbox-workspace-refresh"));
  return result;
}
export function changedWorkspaceFields(previous: DemoData, next: DemoData): WorkspaceChange[] {
  return (Object.keys(next) as (keyof DemoData)[]).filter(field => JSON.stringify(previous[field]) !== JSON.stringify(next[field])).map(field => ({ field, value: next[field] }));
}
