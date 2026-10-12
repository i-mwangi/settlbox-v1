import { prepareAgentPlan } from "@/services/server/prepare-agent-plan";
import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openAgentRuns } from "@/services/server/agent-runs";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  const repository = openAgentRuns();
  try { return Response.json(repository.list(readTreasuryConfiguration().wallet.companyId), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Agent history is unavailable" }, { status: 503 }); }
  finally { repository.close(); }
}

export async function POST(request: Request) {
  let principal;
  try {
    principal = requireOperatorSession(request);
    requireSameOrigin(request);
    if (!["OWNER", "ADMIN"].includes(principal.role)) return Response.json({ error: "Owner or admin access is required to prepare a plan" }, { status: 403 });
  } catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  try { return Response.json(await prepareAgentPlan(await request.json(), principal.id), { status: 201 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Planning failed" }, { status: 400 }); }
}
