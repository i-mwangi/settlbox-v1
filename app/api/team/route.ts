import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openTeamMembers } from "@/services/server/team-members";

export const runtime = "nodejs";
async function handle(request: Request) {
  try { const principal = requireOperatorSession(request); if (request.method !== "GET") { requireSameOrigin(request); if (principal.role !== "OWNER") throw new Error("Owner access is required to manage the team"); } }
  catch { return Response.json({ error: "Workspace owner authorization is required" }, { status: 401 }); }
  const repository = openTeamMembers();
  try {
    const companyId = readTreasuryConfiguration().wallet.companyId;
    if (request.method === "GET") return Response.json(repository.list(companyId), { headers: { "Cache-Control": "no-store" } });
    const value: unknown = await request.json();
    if (request.method === "POST") return Response.json(repository.invite(companyId, value), { status: 201 });
    if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "number" || !Number.isSafeInteger(value.id)) throw new Error("A team member ID is required");
    if (request.method === "DELETE") return Response.json(repository.remove(companyId, value.id));
    if ("action" in value && value.action === "resend") return Response.json(repository.resend(companyId, value.id));
    if (!("data" in value)) throw new Error("Member changes are required");
    return Response.json(repository.update(companyId, value.id, value.data));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Team request failed" }, { status: 400 }); }
  finally { repository.close(); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
