import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openAgentChat, validateChatInput, answerFinanceMessage, paymentPlanId } from "@/services/server/agent-chat";
import { prepareAgentPlan } from "@/services/server/prepare-agent-plan";

import { agentWorkspaceContext, bindOperation, operationTarget } from "@/services/server/agent-dispatch";
import { openAgentProposals } from "@/services/server/agent-proposals";
import type { BusinessRecord } from "@/types/business";
import { fiatChatResult } from "@/services/server/fiat-payouts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  try {
    const principal = requireOperatorSession(request);
    const repository = openAgentChat();
    try { return Response.json(repository.list(readTreasuryConfiguration().wallet.companyId, principal.id), { headers }); }
    finally { repository.close(); }
  } catch { return Response.json({ error: "Conversation is unavailable. Sign in again." }, { status: 401, headers }); }
}
export async function POST(request: Request) {
  let principal;
  try { principal = requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401, headers }); }
  if (!["OWNER", "ADMIN"].includes(principal.role)) return Response.json({ error: "Owner or admin access is required" }, { status: 403, headers });
  const repository = openAgentChat();
  try {
    const raw = await request.text();
    if (raw.length > 12000) throw new Error("Message is too large");
    const input = validateChatInput(JSON.parse(raw));
    const company = readTreasuryConfiguration().wallet.companyId;
    const existing = repository.find(company, principal.id, input);
    if (existing) return Response.json(existing, { headers });
    let run = await prepareAgentPlan({ requestId: input.requestId, throughDate: input.throughDate, reserveUsdc: input.reserveUsdc }, principal.id, false);
    const context = await agentWorkspaceContext(request);
    const allowedFields = new Set(["id","uuid","kind","title","counterparty","recipient","amount","amountExact","dueDate","description","status","paymentLinkCode","transactionHash","recordId","code","paymentWalletAddress","managed","name","email","walletAddress","employeeType","groupIds","companyName","employeeId","payday","payrollCycle","joiningDate","contractTerm","note","generateDaysBefore","employeeName","category","date","currency","receiptUrl","receiptName","businessRecordId","historical","frequency","payment","endDate","nextDueDate","members","role","firstName","lastName","groupId","memberCount"]);
    const compact = (value: unknown): unknown => Array.isArray(value) ? value.slice(0, 20).map(compact) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([key]) => allowedFields.has(key)).map(([key, item]) => [key, typeof item === "string" ? item.slice(0, 500) : compact(item)])) : value;
    const modelContext = { companyWallet: context.companyWallet, today: context.today, records: compact(context.records), vaultPayments: context.vaultPayments && typeof context.vaultPayments === "object" && "payments" in context.vaultPayments ? compact(context.vaultPayments.payments) : [], employees: compact(context.employees), clients: compact(context.clients), contracts: compact(context.contracts), expenses: compact(context.expenses), schedules: compact(context.schedules), collections: compact(context.collections), paymentLinks: compact(context.paymentLinks), team: compact(context.team), automation: context.automation && typeof context.automation === "object" && "config" in context.automation ? context.automation.config : null, notifications: context.notifications, company: compact(context.company), contacts: compact(context.contacts), categories: compact(context.categories), "employee-groups": compact(context["employee-groups"]), "payment-groups": compact(context["payment-groups"]), "invoice-settings": context["invoice-settings"], externalTools: Array.isArray(context.externalTools) ? context.externalTools.slice(0, 20) : [], payout: context.payout && typeof context.payout === "object" ? { mode: "sandbox", recipients: (context.payout as { recipients: { id: string; name: string; country: string; currency: string; channel: string; verification: string; accountNumber: string }[] }).recipients.slice(0, 20).map(row => ({ id: row.id, name: row.name, country: row.country, currency: row.currency, channel: row.channel, verification: row.verification, accountLastFour: row.accountNumber.slice(-4) })), payouts: (context.payout as { payouts: { id: string; amount: string; currency: string; status: string; narration: string; recipient: { id: string; name: string; accountNumber: string } }[] }).payouts.slice(0,20).map(row => ({ id: row.id, amount: row.amount, currency: row.currency, status: row.status, narration: row.narration, recipientId: row.recipient.id, recipientName: row.recipient.name, accountLastFour: row.recipient.accountNumber.slice(-4) })) } : null, providerServices: "Kora fiat payouts are sandbox only, from a separate simulated provider balance. Arc USDC conversion and live fiat payouts are unavailable. Cards, global accounts and USYC execution are not configured. Historical records are not spendable cash." };
    const proposals = openAgentProposals();
    let proposal;
    let answer: Awaited<ReturnType<typeof answerFinanceMessage>>;
    try {
      answer = await answerFinanceMessage(input.message, repository.list(company, principal.id), run, fetch, { ...modelContext, recentActionResults: proposals.list(company, principal.id).slice(0, 5).map(item => ({ id: item.id, tool: item.operation.tool, status: item.status, result: JSON.stringify(item.operation.tool.startsWith("payout.") ? fiatChatResult(item.result) : item.result)?.slice(0, 4000), error: item.error })) });
      if (answer.operation) {
        if (principal.role !== "OWNER") throw new Error("Only the company owner can prepare operational changes");
        if (answer.operation.tool === "payment.review") {
          const recordId = answer.operation.arguments.recordId;
          const record = (context.records as BusinessRecord[]).find(item => item.id === recordId);
          if (record && record.dueDate > run.request.throughDate) {
            const requestId = paymentPlanId(input.requestId, record.id);
            run = await prepareAgentPlan({ requestId, throughDate: record.dueDate, reserveUsdc: input.reserveUsdc }, principal.id, false);
          }
          const saved = (context.vaultPayments as { payments?: { recordId: string; status: string; amount: string; recipient: string }[] })?.payments?.find(item => item.recordId === recordId);
          const resumable = saved && record && ["queue_pending","awaiting_approval","ready","execution_pending"].includes(saved.status) && saved.amount === record.amount && saved.recipient.toLowerCase() === record.recipient.toLowerCase();
          if (!resumable && !run.actions.some(action => action.recordId === recordId && action.tool === "review_payment" && action.disposition === "review")) throw new Error("This payment is not currently eligible for authorization");
        }
        const before = answer.operation.tool === "mcp.call" ? (context.externalTools as {connectionId:string;connectionName:string;name:string}[]).filter(tool => tool.connectionId === answer.operation!.arguments.connectionId && tool.name === answer.operation!.arguments.name).map(tool => ({ service: tool.connectionName, tool: tool.name })) : answer.operation.tool.startsWith("payout.") ? operationTarget(answer.operation, context) : compact(operationTarget(answer.operation, context));
        proposal = proposals.prepare(company, principal.id, input.requestId, bindOperation(answer.operation, context), before);
      }
    } finally { proposals.close(); }
    return Response.json(repository.save(company, principal.id, input, answer.answer, run, answer.recordIds, proposal), { status: 201, headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Chat is unavailable" }, { status: 400, headers }); }
  finally { repository.close(); }
}
