import { useMutation } from "@tanstack/react-query";
import { readWorkspace, workspaceFetch } from "./seeded-workspace";
import type { DemoData } from "@/presentation/contexts/DemoProvider";

export function useRecordMutation<Input, Output>(action: (input: Input) => Promise<Output>) {
  return useMutation({ mutationFn: action, onSuccess: () => window.dispatchEvent(new Event("settlbox-workspace-refresh")) });
}
export async function modifyWorkspace<Field extends keyof DemoData>(field: Field, update: (value: DemoData[Field], data: DemoData) => DemoData[Field]): Promise<DemoData[Field]> {
  const workspace = await readWorkspace();
  const next = update(workspace.data[field], workspace.data);
  await workspaceFetch("/api/seeded-workspace", "PATCH", { entity: workspace.entityId, revision: workspace.revision, changes: [{ field, value: next }] });
  return next;
}
