import type { FinanceAutomation } from "../server/finance-worker-store.ts";
export interface WorkerPayment { recordId: string; status: string }
export interface FinanceCycleTools {
  active(): boolean;
  audit(message: string): void;
  list(): WorkerPayment[];
  reconcile(recordId: string): Promise<WorkerPayment>;
  execute(recordId: string): Promise<unknown>;
  candidates(): Promise<{ runId: string; recordIds: string[] }>;
  queue(runId: string, recordId: string): Promise<unknown>;
}
export async function financeWorkerCycle(config: FinanceAutomation, tools: FinanceCycleTools) {
  let submitted = 0;
  if (!config.enabled || !tools.active()) return { submitted };
  for (const saved of tools.list()) {
    if (!tools.active()) break;
    if (["paid", "cancelled", "expired", "policy_changed"].includes(saved.status) || saved.status.endsWith("review_required")) continue;
    try {
      const payment = await tools.reconcile(saved.recordId);
      tools.audit(`Reconciled ${saved.recordId}: ${payment.status}`);
      if (payment.status === "ready" && submitted < config.maxActions && tools.active()) {
        submitted++; await tools.execute(payment.recordId); tools.audit(`Execution requested for approved obligation ${payment.recordId}`);
      }
    } catch { tools.audit(`Obligation ${saved.recordId} needs review; no fallback payment was attempted`); }
  }
  if (config.autoQueue && submitted < config.maxActions && tools.active()) {
    const plan = await tools.candidates();
    for (const recordId of [...new Set(plan.recordIds)]) {
      if (submitted >= config.maxActions || !tools.active()) break;
      try { submitted++; await tools.queue(plan.runId, recordId); tools.audit(`Queue requested for eligible due obligation ${recordId}`); }
      catch { tools.audit(`Obligation ${recordId} could not be queued; review its current policy and funding`); }
    }
  }
  return { submitted };
}
