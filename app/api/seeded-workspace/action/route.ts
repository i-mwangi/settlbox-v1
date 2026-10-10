import { createHash } from "node:crypto";
import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openSeededWorkspace } from "@/services/server/seeded-workspace";
import { openBusinessRecords } from "@/services/server/business-records";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { workspaceView } from "@/services/server/workspace-view";
import { workspaceEntity } from "@/types/seeded-workspace";
import { PATCH as performBusinessAction } from "@/app/api/business-records/[id]/route";
import type { BusinessRecord } from "@/types/business";
import type { WorkspaceChange } from "@/types/seeded-workspace";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); } catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  const workspaceRepository = openSeededWorkspace();
  const businessRepository = openBusinessRecords();
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") throw new Error("An action is required");
    const input = body as Record<string, unknown>;
    if (typeof input.id !== "string" || typeof input.entity !== "string" || !["invoices", "bills", "payrolls", "pendingProposals"].includes(String(input.field)) || !["pay", "issue", "refresh", "cancel"].includes(String(input.action))) throw new Error("Invalid workspace action");
    const entity = workspaceEntity(input.entity);
    if (entity !== "entity-3") throw new Error("Connect a treasury wallet for this company before making payments");
    const config = readTreasuryConfiguration();
    const field = input.field as "invoices" | "bills" | "payrolls" | "pendingProposals";
    const workspace = workspaceRepository.get(config.wallet.companyId, entity);
    const source = workspace.data[field].find(record => record.uuid === input.id || String(record.id) === input.id);
    if (!source) throw new Error("Record not found");
    const record = source as unknown as Record<string, unknown>;
    if (["PAID", "EXECUTED", "COMPLETED"].includes(String(record.status)) && !record.businessRecordId) throw new Error("This is imported history. Create a new draft to test an Arc payment");
    if (record.status === "CANCELLED" && input.action !== "refresh") throw new Error("This record has been cancelled");
    if (input.action === "cancel" && !record.businessRecordId) {
      const records = workspace.data[field].map(item => item.uuid === source.uuid ? { ...item, status: "CANCELLED" } : item);
      const saved = workspaceRepository.update(config.wallet.companyId, entity, workspace.revision, [{ field, value: records }], true);
      return Response.json(await workspaceView(saved, config));
    }
    const kind = field === "invoices" && record.type !== "RECEIVED" ? "invoice" : field === "payrolls" ? "payroll" : "bill";
    const recipient = kind === "invoice" ? config.wallet.address : input.recipient || record.recipient || record.walletAddress || record.toAddress;
    if (typeof recipient !== "string" || !/^0x[0-9a-f]{40}$/i.test(recipient)) throw new Error("Set a valid Arc recipient wallet before paying this record");
    const digest = createHash("sha256").update(`${config.wallet.companyId}:${entity}:${field}:${input.id}`).digest("hex");
    const id = typeof record.businessRecordId === "string" ? record.businessRecordId : `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
    const details = { kind, title: String(record.invoiceNumber || record.name || record.label || record.vendor || "Business payment"), counterparty: String(record.to || record.vendor || record.name || "Business counterparty"), description: String(record.description || record.note || ""), amount: String(record.amountExact ?? record.amount ?? record.totalAmount), recipient, dueDate: String(record.dueDate || new Date().toISOString().slice(0, 10)).slice(0, 10) };
    let canonical = businessRepository.get(config.wallet.companyId, id);
    if (!canonical) canonical = businessRepository.create(config.wallet.companyId, details, id);
    else if (canonical.status === "draft" && !record.businessRecordId) canonical = businessRepository.updateDraft(config.wallet.companyId, id, details);
    const response = await performBusinessAction(new Request(new URL(`/api/business-records/${id}`, request.url), { method: "PATCH", headers: request.headers, body: JSON.stringify({ action: input.action }) }), { params: Promise.resolve({ id }) });
    const result: unknown = await response.json();
    if (!response.ok) return Response.json(result, { status: response.status });
    const settled = result as BusinessRecord;
    const current = workspaceRepository.get(config.wallet.companyId, entity);
    const status = settled.status === "paid" ? "PAID" : settled.status === "issued" ? "SENT" : settled.status.toUpperCase();
    const records = current.data[field].map(item => item.uuid === source.uuid ? { ...item, status, businessRecordId: id, recipient, txHash: settled.transactionHash || "", paymentLinkCode: settled.paymentLinkCode, ...(settled.status === "paid" ? { paidAt: settled.updatedAt } : {}) } : item);
    const changes: WorkspaceChange[] = [{ field, value: records }];
    if (settled.status === "paid" && settled.transactionHash && !current.data.transactions.some(transaction => transaction.id === id)) changes.push({ field: "transactions", value: [{ id, type: kind === "invoice" ? "RECEIVE" : "SEND", status: "COMPLETED", amount: Number(settled.amount), currency: "USDC", from: kind === "invoice" ? settled.counterparty : current.data.company.companyName, fromAddress: kind === "invoice" ? "" : config.wallet.address, to: kind === "invoice" ? current.data.company.companyName : settled.counterparty, toAddress: recipient, accountId: config.wallet.address, category: kind, label: settled.title, txHash: settled.transactionHash, timestamp: settled.updatedAt, note: settled.description }, ...current.data.transactions] });
    const saved = workspaceRepository.update(config.wallet.companyId, entity, current.revision, changes, true);
    return Response.json(await workspaceView(saved, config));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Action did not complete; refresh before retrying" }, { status: 409 }); }
  finally { workspaceRepository.close(); businessRepository.close(); }
}
