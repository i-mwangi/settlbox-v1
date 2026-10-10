import type { DemoData } from "../presentation/contexts/DemoProvider";

export const workspaceEntityIds = ["primary", "entity-2", "entity-3"] as const;
export type WorkspaceEntityId = typeof workspaceEntityIds[number];
export interface SeededWorkspace { entityId: WorkspaceEntityId; revision: number; data: DemoData; importedAt: string; treasuryAddress: string | null }
export interface WorkspaceChange { field: keyof DemoData; value: unknown }
export function workspaceEntity(value: string): WorkspaceEntityId {
  if (!workspaceEntityIds.includes(value as WorkspaceEntityId)) throw new Error("Unknown company workspace");
  return value as WorkspaceEntityId;
}
