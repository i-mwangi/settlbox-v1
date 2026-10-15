import { openAgentRuns } from "./agent-runs.ts";
import { openBusinessRecords } from "./business-records.ts";
import { openTreasury, readTreasuryConfiguration } from "./treasury-runtime.ts";
import { planBusinessActions, validateAgentPlanRequest } from "../arc/agent-planner.ts";
import { parseBaseUnits } from "../arc/amount.ts";
import { reviewAgentPlan } from "./azure-agent.ts";
import { readTreasuryVaultStatus } from "./treasury-vault.ts";
import { vaultPlanningContext } from "./vault-planning.ts";

export async function prepareAgentPlan(value: unknown, principalId: string, advisory = true) {
  const repository = openAgentRuns();
  try {
    const input = validateAgentPlanRequest(value);
    const companyId = readTreasuryConfiguration().wallet.companyId;
    const existing = repository.find(companyId, input);
    if (existing) return existing;
    const vault = await readTreasuryVaultStatus(companyId);
    if (vault.state === "verified") {
      const records = openBusinessRecords();
      try {
        const plan = planBusinessActions(input, await vaultPlanningContext(companyId, records.list(companyId), vault));
        const reviewed = advisory ? await reviewAgentPlan(plan) : plan;
        return repository.save(companyId, principalId, input, { ...reviewed, fundingSource: "treasury_vault" });
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
        const reviewed = advisory ? await reviewAgentPlan(plan) : plan;
        return repository.save(companyId, principalId, input, reviewed);
      } finally { records.close(); }
    } finally { treasury.close(); }
  } finally { repository.close(); }
}
