import { createHash } from "node:crypto";
import type { AgentOperation } from "../../types/agent-operation";
import { requireOperatorSession } from "./operator-session";
import { readTreasuryConfiguration } from "./treasury-runtime";
import { validateAgentOperation } from "./agent-tools";
import { openMcpConnections, callMcp } from "./mcp-connections";
import { openBusinessRecords } from "./business-records";
import { openReimbursements } from "./reimbursements";
import { openPaymentLinks } from "./payment-links";
import { agentWorkspaceFields, readAgentWorkspace, changeAgentWorkspace } from "./agent-workspace";
import * as business from "@/app/api/business-records/route";
import * as businessItem from "@/app/api/business-records/[id]/route";
import * as workspace from "@/app/api/workspace/[resource]/route";
import * as contracts from "@/app/api/payroll-contracts/route";
import * as expenses from "@/app/api/reimbursements/route";
import * as schedules from "@/app/api/payment-schedules/route";
import * as collections from "@/app/api/group-collections/route";
import * as notifications from "@/app/api/notifications/preferences/route";
import * as team from "@/app/api/team/route";
import * as automation from "@/app/api/agent-worker/route";
import * as providerHistory from "@/app/api/provider-history/route";
import * as links from "@/app/api/payment-links/route";
import * as vaultPayments from "@/app/api/agent-payments/route";
import * as linkItem from "@/app/api/payment-links/[code]/route";

type Method = "GET" | "POST" | "PATCH" | "DELETE";
function requestFor(source: Request, path: string, method: Method, body?: unknown, id?: string) {
  const headers = new Headers(source.headers); headers.set("Content-Type", "application/json");
  if (id) headers.set("Idempotency-Key", id);
  return new Request(new URL(path, source.url), { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function result(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value?.error || "The operation could not be completed");
  return value;
}
export async function agentWorkspaceContext(source: Request): Promise<Record<string, unknown> & { companyWallet: string; today: string }> {
  const entries: [string, unknown][] = Object.entries(readAgentWorkspace(readTreasuryConfiguration().wallet.companyId));
  entries.push(["payment-groups", await result(await workspace.GET(requestFor(source, "/api/workspace/payment-groups", "GET"), { params: Promise.resolve({ resource: "payment-groups" }) }))]);
  const routes = { records: business.GET, contracts: contracts.GET, expenses: expenses.GET, schedules: schedules.GET, collections: collections.GET, notifications: notifications.GET, team: team.GET, automation: automation.GET, providerHistory: providerHistory.GET, paymentLinks: links.GET, vaultPayments: vaultPayments.GET };
  const paths = { records: "business-records", contracts: "payroll-contracts", expenses: "reimbursements", schedules: "payment-schedules", collections: "group-collections", notifications: "notifications/preferences", team: "team", automation: "agent-worker", providerHistory: "provider-history", paymentLinks: "payment-links", vaultPayments: "agent-payments" };
  for (const [key, handler] of Object.entries(routes)) {
    try { entries.push([key, await result(await handler(requestFor(source, `/api/${paths[key as keyof typeof paths]}`, "GET")))]); }
    catch { entries.push([key, { unavailable: true }]); }
  }
  const mcp = openMcpConnections();
  try { entries.push(["externalTools", mcp.list(readTreasuryConfiguration().wallet.companyId).flatMap(connection => connection.tools.filter(tool => connection.enabledTools.includes(tool.name)).map(tool => ({ connectionId: connection.id, connectionName: connection.name, name: tool.name, description: tool.description, inputSchema: tool.inputSchema, fingerprint: tool.fingerprint })))]); }
  finally { mcp.close(); }
  return { companyWallet: readTreasuryConfiguration().wallet.address, today: new Date().toISOString().slice(0, 10), ...Object.fromEntries(entries) };
}
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function operationTarget(operation: AgentOperation, context: Record<string, unknown>): unknown {
  const a = operation.arguments;
  if (operation.tool.startsWith("business.") && operation.tool !== "business.create") return (context.records as {id:string}[])?.find(item => item.id === a.id);
  if (operation.tool.startsWith("workspace.")) {
    const rows = context[String(a.resource)];
    if (!Array.isArray(rows)) return rows;
    return operation.tool === "workspace.delete" ? rows.filter(item => (a.ids as unknown[]).some(id => item.id === id || item.uuid === id)) : a.id ? rows.find(item => item.id === a.id || item.uuid === a.id) : null;
  }
  if (operation.tool.startsWith("contract.") && !["contract.create", "contract.confirm"].includes(operation.tool)) return (context.contracts as {id:number}[])?.find(item => item.id === a.id);
  if (operation.tool.startsWith("expense.") && operation.tool !== "expense.create") return (context.expenses as {id:string}[])?.find(item => item.id === a.id);
  if (operation.tool === "schedule.status") return (context.schedules as {id:string}[])?.find(item => item.id === a.id);
  if (operation.tool === "automation.configure") return (context.automation as {config:unknown})?.config;
  if (operation.tool === "notifications.save") return (context.notifications as {preferences:unknown})?.preferences;
  if (["team.update", "team.remove"].includes(operation.tool)) return (context.team as {id:number}[])?.find(item => item.id === a.id);
  if (operation.tool === "link.update") return (context.paymentLinks as {code:string}[])?.find(item => item.code === a.code);
  return null;
}
export function bindOperation(operation: AgentOperation, context: Record<string, unknown>) {
  const target = operationTarget(operation, context);
  if (target === undefined || (Array.isArray(target) && !target.length)) throw new Error("The requested saved record was not found. Ask which record the user means.");
  return { ...operation, precondition: digest(target) };
}
export async function dispatchAgentOperation(source: Request, saved: AgentOperation, id: string) {
  if (requireOperatorSession(source).role !== "OWNER") throw new Error("Company owner authorization is required");
  const operation = validateAgentOperation(saved); const a = operation.arguments; const tool = operation.tool;
  // Current canonical values, not the model's snapshot, decide whether an approval is still valid.
  const context = await agentWorkspaceContext(source);
  if (saved.precondition && digest(operationTarget(operation, context)) !== saved.precondition) throw new Error("This record changed after review. Ask again for its current details.");
  const call = (path: string, method: Method, body: unknown) => requestFor(source, path, method, body, id);
  if (tool === "business.create") {
    if (a.kind === "invoice" && a.recipient !== readTreasuryConfiguration().wallet.address) throw new Error("Invoice recipient must be the company treasury");
    return result(await business.POST(call("/api/business-records", "POST", a)));
  }
  if (tool.startsWith("business.")) return result(await businessItem.PATCH(call(`/api/business-records/${a.id}`, "PATCH", { action: tool.split(".")[1], ...(a.data ? { data: a.data } : {}) }), { params: Promise.resolve({ id: String(a.id) }) }));
  if (tool.startsWith("workspace.")) {
    if (String(a.resource) in agentWorkspaceFields) return changeAgentWorkspace(readTreasuryConfiguration().wallet.companyId, tool, a);
    const resource = String(a.resource); const params = { params: Promise.resolve({ resource }) };
    if (tool === "workspace.delete") return result(await workspace.DELETE(call(`/api/workspace/${resource}`, "DELETE", { ids: a.ids }), params));
    return result(await (a.id ? workspace.PATCH : workspace.POST)(call(`/api/workspace/${resource}`, a.id ? "PATCH" : "POST", a.id ? { id: a.id, data: a.data } : a.data), params));
  }
  if (tool.startsWith("contract.")) {
    const action = tool.split(".")[1];
    return result(await (action === "create" ? contracts.POST : contracts.PATCH)(call("/api/payroll-contracts", action === "create" ? "POST" : "PATCH", action === "create" ? a : { ...a, action: action === "status" ? a.action : action })));
  }
  if (tool === "expense.prepare") {
    const config = readTreasuryConfiguration(); const rows = openReimbursements(); const records = openBusinessRecords();
    try {
      const row = rows.get(config.wallet.companyId, "entity-3", String(a.id));
      if (!row || row.historical || row.status !== "approved") throw new Error("Approve a current reimbursement before preparing its payment");
      const record = records.create(config.wallet.companyId, { kind: "reimbursement", title: `Expense: ${row.category}`, counterparty: row.employeeName, recipient: row.recipient, amount: row.amountExact, dueDate: row.date, description: row.description, receiptUrls: row.receiptUrl ? [row.receiptUrl] : [] }, row.id);
      if (!row.businessRecordId) rows.update(config.wallet.companyId, "entity-3", row.id, row, { ...row, businessRecordId: record.id });
      return record;
    } finally { rows.close(); records.close(); }
  }
  if (tool.startsWith("expense.")) return result(await expenses.POST(call("/api/reimbursements", "POST", tool === "expense.create" ? { action: "create", entity: "entity-3", record: { ...a, id } } : { ...a, entity: "entity-3" })));
  if (tool.startsWith("schedule.")) return result(await (tool === "schedule.status" ? schedules.PATCH : schedules.POST)(call("/api/payment-schedules", tool === "schedule.status" ? "PATCH" : "POST", tool === "schedule.prepare" ? { action: "prepare" } : { ...a, ...(tool === "schedule.create" ? { id } : {}) })));
  if (tool === "collection.create") return result(await collections.POST(call("/api/group-collections", "POST", { ...a, id })));
  if (tool === "link.create") {
    if (a.paymentWalletAddress !== readTreasuryConfiguration().wallet.address) throw new Error("Company payment links must collect into the company treasury");
    const repository = openPaymentLinks(); try { return repository.create(a, id); } finally { repository.close(); }
  }
  if (tool === "link.update") return result(await linkItem.PATCH(call(`/api/payment-links/${a.code}`, "PATCH", a.data), { params: Promise.resolve({ code: String(a.code) }) }));
  if (tool === "notifications.save") return result(await notifications.PATCH(call("/api/notifications/preferences", "PATCH", a)));
  if (tool.startsWith("team.")) return result(await (tool === "team.invite" ? team.POST : tool === "team.remove" ? team.DELETE : team.PATCH)(call("/api/team", tool === "team.invite" ? "POST" : tool === "team.remove" ? "DELETE" : "PATCH", a)));
  if (tool.startsWith("automation.")) return result(await automation.POST(call("/api/agent-worker", "POST", tool === "automation.run" ? { action: "tick" } : { action: "configure", settings: { enabled: a.enabled, autoQueue: a.autoQueue, reserveUsdc: a.reserveUsdc, maxActions: a.maxActions } })));
  if (tool === "mcp.call") {
    const store = openMcpConnections();
    try {
      const company = readTreasuryConfiguration().wallet.companyId;
      const connection = store.get(company, String(a.connectionId)); if (!connection) throw new Error("MCP connection was removed");
      return await callMcp(connection, String(a.name), a.input as Record<string, unknown>, String(a.fingerprint), undefined, () => {
        const current = store.get(company, connection.id);
        return Boolean(current && current.url === connection.url && current.tokenEnv === connection.tokenEnv && current.enabledTools.includes(String(a.name)) && current.tools.some(tool => tool.name === a.name && tool.fingerprint === a.fingerprint));
      });
    }
    catch { throw new Error("External tool did not return a verified result. Check the external service before submitting another call."); }
    finally { store.close(); }
  }
  throw new Error("This action requires its secure payment or wallet authorization screen");
}
