import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openWorkspace, workspaceResource } from "@/services/server/workspace-records";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ resource: string }> };

async function handle(request: Request, context: RouteContext) {
  try { requireOperatorSession(request); if (request.method !== "GET") requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const repository = openWorkspace();
  try {
    const resource = workspaceResource((await context.params).resource);
    const companyId = readTreasuryConfiguration().wallet.companyId;
    if (request.method === "GET") return Response.json(repository.list(companyId, resource), { headers: { "Cache-Control": "no-store" } });
    const value: unknown = await request.json();
    if (!value || typeof value !== "object") throw new Error("A record is required");
    if (request.method === "DELETE") return Response.json(repository.delete(companyId, resource, "ids" in value ? value.ids : undefined));
    if (request.method === "PATCH") {
      if (!("id" in value) || !("data" in value)) throw new Error("Record ID and changes are required");
      return Response.json(repository.save(companyId, resource, value.data, value.id));
    }
    return Response.json(repository.save(companyId, resource, value), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Workspace request failed" }, { status: 400 }); }
  finally { repository.close(); }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
