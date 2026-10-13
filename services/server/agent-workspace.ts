import { randomUUID } from "node:crypto";
import { openSeededWorkspace } from "./seeded-workspace.ts";
import { validateWorkspaceRecord, workspaceResource } from "./workspace-records.ts";
import type { WorkspaceChange } from "../../types/seeded-workspace";

export const agentWorkspaceFields = { employees: "employees", clients: "clients", contacts: "contacts", "employee-groups": "employeeGroups", categories: "contactCategories", company: "company", "invoice-settings": "invoiceSettings" } as const;
export function readAgentWorkspace(company: string): Record<string, unknown> {
  const repository = openSeededWorkspace();
  try {
    const { data } = repository.get(company, "entity-3");
    return Object.fromEntries(Object.entries(agentWorkspaceFields).map(([resource, field]) => [resource, data[field]]));
  } finally { repository.close(); }
}
export function changeAgentWorkspace(company: string, tool: string, args: Record<string, unknown>) {
  const resource = workspaceResource(String(args.resource));
  const field = agentWorkspaceFields[resource as keyof typeof agentWorkspaceFields];
  if (!field) throw new Error("Use the dedicated resource workflow");
  const repository = openSeededWorkspace();
  try {
    const current = repository.get(company, "entity-3");
    const value = current.data[field];
    let next: unknown;
    let result: unknown;
    if (Array.isArray(value)) {
      const rows = value as unknown as Record<string, unknown>[];
      const matches = (row: Record<string, unknown>, id: unknown) => row.id === id || row.uuid === id;
      if (tool === "workspace.delete") {
        const ids = args.ids as unknown[];
        next = rows.filter(row => !ids.some(id => matches(row, id)));
        result = { deleted: rows.length - (next as unknown[]).length };
      } else {
        const existing = args.id === undefined ? undefined : rows.find(row => matches(row, args.id));
        if (args.id !== undefined && !existing) throw new Error("Workspace record not found");
        const details = validateWorkspaceRecord(resource, { ...existing, ...(args.data as object) });
        const now = new Date().toISOString();
        const row = { ...existing, ...details, id: existing?.id ?? Math.max(0, ...rows.map(row => Number.isSafeInteger(row.id) ? Number(row.id) : 0)) + 1, uuid: existing?.uuid ?? randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now };
        next = existing ? rows.map(item => item === existing ? row : item) : [...rows, row];
        result = row;
      }
    } else {
      if (tool !== "workspace.save") throw new Error("Workspace settings cannot be deleted");
      const merged = { ...value, ...(args.data as object) };
      next = { ...merged, ...validateWorkspaceRecord(resource, merged) }; result = next;
    }
    repository.update(company, "entity-3", current.revision, [{ field, value: next } satisfies WorkspaceChange]);
    return result;
  } finally { repository.close(); }
}
