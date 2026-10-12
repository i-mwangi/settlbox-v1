import { formatAmount, parseAmount, parseBaseUnits } from "./amount.ts";
import { validateCalendarDate } from "../server/payment-schedules.ts";
import type { AgentPlan, AgentPlanRequest, AgentPlanningContext } from "../../types/agent";

export function validateAgentPlanRequest(input: unknown): AgentPlanRequest {
  if (!input || typeof input !== "object") throw new Error("A planning request is required");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !["requestId", "throughDate", "reserveUsdc"].includes(key))) throw new Error("Unsupported planning parameter");
  if (typeof value.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId)) throw new Error("A UUID request ID is required");
  if (typeof value.throughDate !== "string") throw new Error("A planning date is required");
  validateCalendarDate(value.throughDate);
  if (typeof value.reserveUsdc !== "string" || value.reserveUsdc.length > 40) throw new Error("A USDC reserve is required");
  parseAmount(value.reserveUsdc, 6);
  return { requestId: value.requestId, throughDate: value.throughDate, reserveUsdc: value.reserveUsdc };
}

export function planBusinessActions(input: AgentPlanRequest, context: AgentPlanningContext): AgentPlan {
  const request = validateAgentPlanRequest(input);
  if (context.records.length >= 500) throw new Error("Planning requires a complete record set; the current record limit was reached");
  if (context.records.some(record => record.companyId !== context.companyId)) throw new Error("Planning records belong to another company");
  const balance = parseBaseUnits(context.balanceBaseUnits);
  const reserved = parseBaseUnits(context.reservedBaseUnits);
  const reserve = parseAmount(request.reserveUsdc);
  let remaining = balance > reserved + reserve ? balance - reserved - reserve : 0n;
  const dailyLimit = parseBaseUnits(context.policy.dailyLimitBaseUnits);
  const committedToday = parseBaseUnits(context.committedTodayBaseUnits);
  let dailyRemaining = dailyLimit > committedToday ? dailyLimit - committedToday : 0n;
  let obligations = 0n;
  const active = context.records.filter(record => record.dueDate <= request.throughDate && !["paid", "cancelled", "confirmed"].includes(record.status));
  active.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  const actions = active.map(record => {
    const amount = parseAmount(record.amount);
    const reasons: string[] = [];
    const incoming = record.kind === "invoice";
    if (!incoming) {
      obligations += amount;
      if (!context.policy.allowedRecipients.some(address => address.toLowerCase() === record.recipient.toLowerCase())) reasons.push("Recipient is outside the treasury allowlist");
      if (amount > parseBaseUnits(context.policy.maxPaymentBaseUnits)) reasons.push("Amount exceeds the payment limit");
      if (amount > dailyRemaining) reasons.push("Amount exceeds the remaining daily limit");
      if (amount > remaining) reasons.push("Payment would consume reserved liquidity");
      if (["processing", "submitted", "ready", "awaiting_approval"].includes(record.status)) reasons.push("Payment already has an active workflow");
      if (!reasons.length) { remaining -= amount; dailyRemaining -= amount; }
    }
    return { recordId: record.id, kind: record.kind, title: record.title, amountUsdc: record.amount, dueDate: record.dueDate,
      tool: incoming ? "review_receivable" as const : "review_payment" as const,
      disposition: reasons.length ? "blocked" as const : "review" as const,
      reasons: reasons.length ? reasons : [incoming ? "Review the receivable and its saved payment status" : "Human review and current treasury authorization are required"],
    };
  });
  return { mode: "proposal_only", engine: "deterministic", balanceUsdc: formatAmount(balance), reserveUsdc: request.reserveUsdc,
    obligationsUsdc: formatAmount(obligations), unallocatedUsdc: formatAmount(remaining), actions };
}
