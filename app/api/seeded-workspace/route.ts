import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openSeededWorkspace } from "@/services/server/seeded-workspace";
import { workspaceEntity } from "@/types/seeded-workspace";
import type { WorkspaceChange } from "@/types/seeded-workspace";
import { workspaceView } from "@/services/server/workspace-view";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try { requireOperatorSession(request); } catch { return Response.json({ error: "Sign in to your workspace" }, { status: 401 }); }
  const repository = openSeededWorkspace();
  try {
    const config = readTreasuryConfiguration();
    const entity = workspaceEntity(new URL(request.url).searchParams.get("entity") || "entity-3");
    return Response.json(await workspaceView(repository.get(config.wallet.companyId, entity), config), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Workspace could not be loaded" }, { status: 400 }); }
  finally { repository.close(); }
}
export async function PATCH(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); } catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  const repository = openSeededWorkspace();
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || !("entity" in input) || !("revision" in input) || !("changes" in input) || typeof input.entity !== "string" || typeof input.revision !== "number" || !Array.isArray(input.changes)) throw new Error("Workspace changes are required");
    const config = readTreasuryConfiguration();
    const saved = repository.update(config.wallet.companyId, workspaceEntity(input.entity), input.revision, input.changes as WorkspaceChange[]);
    return Response.json(await workspaceView(saved, config));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Workspace was not saved" }, { status: 409 }); }
  finally { repository.close(); }
}
