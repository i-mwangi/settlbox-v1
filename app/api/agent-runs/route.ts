import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openAgentRuns } from "@/services/server/agent-runs";
import { openBusinessRecords } from "@/services/server/business-records";
import { openTreasury, readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { planBusinessActions, validateAgentPlanRequest } from "@/services/arc/agent-planner";
import { parseBaseUnits } from "@/services/arc/amount";
import { reviewAgentPlan } from "@/services/server/azure-agent";
import { readTreasuryVaultStatus } from "@/services/server/treasury-vault";
import { vaultPlanningContext } from "@/services/server/vault-planning";

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
  const repository = openAgentRuns();
  try {
    const input = validateAgentPlanRequest(await request.json());
    const companyId = readTreasuryConfiguration().wallet.companyId;
    const existing = repository.find(companyId, input);
    if (existing) return Response.json(existing);
    const vault = await readTreasuryVaultStatus(companyId);
    if (vault.state === "verified") {
      const records = openBusinessRecords();
      try {
        const plan = planBusinessActions(input, await vaultPlanningContext(companyId, records.list(companyId)));
        const reviewed = await reviewAgentPlan(plan);
        return Response.json(repository.save(companyId, principal.id, input, { ...reviewed, fundingSource: "treasury_vault" }), { status: 201 });
      } finally { records.close(); }
    }
    const treasury = await openTreasury();
    try {
      const records = openBusinessRecords();
      try {
        const commitments = treasury.repository.planningCommitments(companyId, treasury.config.wallet.id);
        const plan = planBusinessActions(input, {
          companyId, balanceBaseUnits: treasury.balance, policy: treasury.config.policy,
          ...commitments, reservedBaseUnits: (parseBaseUnits(commitments.reservedBaseUnits) + parseBaseUnits(treasury.config.gasReserveBaseUnits)).toString(), records: records.list(companyId),
        });
        const reviewed = await reviewAgentPlan(plan);
        return Response.json(repository.save(companyId, principal.id, input, reviewed), { status: 201 });
      } finally { records.close(); }
    } finally { treasury.close(); }
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Planning failed" }, { status: 400 }); }
  finally { repository.close(); }
}
