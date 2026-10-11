import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { FinanceWorkerStore } from "./finance-worker-store";
import { financeWorkerCycle } from "../arc/finance-worker-cycle";
import { openVaultPayments, executeVaultPayment, queueVaultPayment, reconcileVaultPayment, vaultPaymentContext } from "./vault-payments";
import { parseAmount } from "../arc/amount";
import { openBusinessRecords } from "./business-records";
import { openAgentRuns } from "./agent-runs";
import { vaultPlanningContext } from "./vault-planning";
import { planBusinessActions } from "../arc/agent-planner";
import { reviewAgentPlan } from "./azure-agent";

export function openFinanceWorker() { return new FinanceWorkerStore(resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite")); }
export async function runFinanceWorker(companyId: string) {
  const store = openFinanceWorker(); const lease = store.acquire(companyId);
  if (!lease) { store.close(); return { status: "disabled_or_busy", submitted: 0 }; }
  const active = () => store.active(companyId, lease.token, lease.config.revision);
  const audit = (message: string) => { store.renew(companyId, lease.token); store.event(companyId, lease.token, message); };
  try {
    const result = await financeWorkerCycle(lease.config, {
      active, audit,
      list: () => { const journal = openVaultPayments(); try { return journal.list(companyId); } finally { journal.close(); } },
      reconcile: recordId => reconcileVaultPayment(companyId, recordId),
      execute: async recordId => {
        const context = await vaultPaymentContext(companyId);
        const journal = openVaultPayments();
        try {
          const payment = journal.get(companyId, recordId);
          if (!payment || !active()) throw new Error("Worker stopped or payment unavailable");
          if (parseAmount(context.vault.balanceUsdc) < parseAmount(payment.amount) + parseAmount(context.vault.policy.liquidityFloorUsdc) + parseAmount(lease.config.reserveUsdc)) throw new Error("Worker liquidity reserve prevents execution");
        } finally { journal.close(); }
        return executeVaultPayment(companyId, recordId);
      },
      queue: (runId, recordId) => queueVaultPayment(companyId, "finance-worker", runId, recordId),
      candidates: async () => {
        const records = openBusinessRecords(); const runs = openAgentRuns();
        try {
          const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
          const request = { requestId: randomUUID(), throughDate: today, reserveUsdc: lease.config.reserveUsdc };
          const context = await vaultPlanningContext(companyId, records.list(companyId));
          const plan = planBusinessActions(request, context);
          const eligible = plan.actions.filter(action => action.tool === "review_payment" && action.disposition === "review");
          if (!eligible.length) return { runId: request.requestId, recordIds: [] };
          const reviewed = await reviewAgentPlan(plan);
          const saved = runs.save(companyId, "finance-worker", request, { ...reviewed, fundingSource: "treasury_vault" });
          return { runId: saved.id, recordIds: eligible.map(action => action.recordId) };
        } finally { records.close(); runs.close(); }
      },
    });
    audit(`Cycle finished: ${result.submitted} submission attempts`); return { status: "complete", ...result };
  } catch { audit("Cycle stopped after an upstream or policy error; no bypass was attempted"); return { status: "review_required", submitted: 0 }; }
  finally { store.release(companyId, lease.token); store.close(); }
}
