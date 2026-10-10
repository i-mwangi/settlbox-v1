import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openReimbursements } from "@/services/server/reimbursements";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { workspaceEntity } from "@/types/seeded-workspace";
import { openBusinessRecords } from "@/services/server/business-records";
import { PATCH as performBusinessAction } from "@/app/api/business-records/[id]/route";
import { POST as approvePayment } from "@/app/api/treasury/payments/[id]/approve/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { requireOperatorSession(request); } catch { return Response.json({ error: "Sign in to your workspace" }, { status: 401 }); }
  const repository = openReimbursements();
  const business = openBusinessRecords();
  try {
    const company = readTreasuryConfiguration().wallet.companyId;
    const entity = workspaceEntity(new URL(request.url).searchParams.get("entity") || "entity-3");
    const rows = repository.list(company, entity).map(row => {
      const record = row.businessRecordId ? business.get(company, row.businessRecordId) : undefined;
      if (!record) return row;
      return { ...row, status: record.status === "paid" ? "paid" : record.status === "failed" ? "failed" : record.status === "awaiting_approval" ? "awaiting_approval" : record.status === "draft" ? "approved" : "processing", transactionHash: record.transactionHash, ...(record.status === "paid" ? { settledAt: record.updatedAt } : {}) };
    });
    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not load reimbursements" }, { status: 400 }); }
  finally { repository.close(); business.close(); }
}

export async function POST(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); } catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  const repository = openReimbursements();
  const business = openBusinessRecords();
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("entity" in body) || typeof body.entity !== "string") throw new Error("Workspace entity is required");
    const input = body as Record<string, unknown>;
    const entity = workspaceEntity(body.entity);
    const company = readTreasuryConfiguration().wallet.companyId;
    if (input.action === "create") return Response.json(repository.create(company, entity, input.record), { status: 201 });
    if (typeof input.id !== "string" || !["approve", "reject", "pay", "refresh", "authorize"].includes(String(input.action))) throw new Error("Invalid reimbursement action");
    const row = repository.get(company, entity, input.id);
    if (!row) return Response.json({ error: "Reimbursement not found" }, { status: 404 });
    if (row.historical) throw new Error("Historical examples cannot initiate payments; create a new expense");
    if (input.action === "approve" || input.action === "reject") {
      if (row.status !== "pending") throw new Error("Only pending expenses can be reviewed");
      if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 500)) throw new Error("Approval note must be at most 500 characters");
      return Response.json(repository.update(company, entity, row.id, row, { ...row, status: input.action === "approve" ? "approved" : "rejected", approvalNote: typeof input.note === "string" ? input.note : "" }));
    }
    if (entity !== "entity-3") throw new Error("Connect a treasury for this workspace before paying");
    if (!row.businessRecordId && row.status !== "approved") throw new Error("Approve the expense before submitting payment");
    if (input.action === "refresh" && !row.businessRecordId) return Response.json(row);
    let current = row;
    if (!current.businessRecordId) {
      business.create(company, { kind: "reimbursement", title: `Expense: ${row.category}`, counterparty: row.employeeName, recipient: row.recipient, amount: row.amountExact, dueDate: row.date, description: row.description, receiptUrls: row.receiptUrl ? [row.receiptUrl] : [] }, row.id);
      current = repository.update(company, entity, row.id, row, { ...row, businessRecordId: row.id });
    }
    if (input.action === "authorize") {
      const approval = await approvePayment(new Request(new URL(`/api/treasury/payments/${row.id}/approve`, request.url), { method: "POST", headers: request.headers, body: "{}" }), { params: Promise.resolve({ id: row.id }) });
      if (!approval.ok) return Response.json(await approval.json(), { status: approval.status });
    }
    const response = await performBusinessAction(new Request(new URL(`/api/business-records/${row.id}`, request.url), { method: "PATCH", headers: request.headers, body: JSON.stringify({ action: input.action === "authorize" ? "refresh" : input.action }) }), { params: Promise.resolve({ id: row.id }) });
    const result: unknown = await response.json();
    if (!response.ok) return Response.json(result, { status: response.status });
    const settled = business.get(company, row.id);
    if (!settled) throw new Error("Payment record is unavailable");
    return Response.json(repository.update(company, entity, row.id, current, { ...current, status: settled.status === "paid" ? "paid" : settled.status === "failed" ? "failed" : settled.status === "awaiting_approval" ? "awaiting_approval" : settled.status === "draft" ? "approved" : "processing", transactionHash: settled.transactionHash }));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Expense action did not complete; refresh before retrying" }, { status: 409 }); }
  finally { repository.close(); business.close(); }
}
