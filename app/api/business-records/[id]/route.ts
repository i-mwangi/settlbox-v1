import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openBusinessRecords } from "@/services/server/business-records";
import { openPaymentLinks } from "@/services/server/payment-links";
import { openTreasury, readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { parseAmount } from "@/services/arc/amount";
import type { BusinessRecordStatus } from "@/types/business";

export const runtime = "nodejs";
const pending: BusinessRecordStatus[] = ["processing", "submitted", "awaiting_approval", "ready"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  let config: ReturnType<typeof readTreasuryConfiguration>;
  try { config = readTreasuryConfiguration(); }
  catch { return Response.json({ error: "Treasury configuration is unavailable" }, { status: 503 }); }
  const repository = openBusinessRecords();
  const links = openPaymentLinks();
  let treasury: Awaited<ReturnType<typeof openTreasury>> | undefined;
  const { id } = await context.params;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("action" in body)) throw new Error("An action is required");
    let record = repository.get(config.wallet.companyId, id);
    if (!record) return Response.json({ error: "Business record not found" }, { status: 404 });
    if (body.action === "edit" && "data" in body) {
      if (record.kind === "invoice" && typeof body.data === "object" && body.data !== null && "recipient" in body.data && body.data.recipient !== config.wallet.address) throw new Error("Invoices must collect into the company treasury wallet");
      return Response.json(repository.updateDraft(config.wallet.companyId, id, body.data));
    }
    if (body.action === "cancel") {
      return Response.json(repository.cancel(config.wallet.companyId, id));
    }
    if (record.kind === "invoice") {
      if (body.action === "issue") {
        if (record.status === "issued" || record.status === "paid") return Response.json(record);
        record = repository.transition(config.wallet.companyId, id, "processing", ["draft", "processing"]);
        const link = links.create({ title: record.title, description: record.description, amount: record.amount, paymentWalletAddress: record.recipient }, record.id);
        return Response.json(repository.transition(config.wallet.companyId, id, "issued", ["processing"], { paymentLinkCode: link.code }));
      }
      if (body.action !== "refresh") throw new Error("Invoices collect incoming payments through their payment link");
      const link = record.paymentLinkCode ? links.get(record.paymentLinkCode) : undefined;
      if (link?.records[0]) record = repository.transition(config.wallet.companyId, id, "paid", ["issued", "paid"], { transactionHash: link.records[0].txid });
      return Response.json(record);
    }
    if (body.action !== "pay" && body.action !== "refresh") throw new Error("Invalid business record action");
    if (record.status === "paid" || record.status === "cancelled") return Response.json(record);
    if (body.action === "pay") repository.claimPaymentRoute(config.wallet.companyId, id, "treasury");
    treasury = await openTreasury();
    let payment = treasury.repository.find(id, config.wallet.companyId);
    if (payment && body.action === "refresh") repository.claimPaymentRoute(config.wallet.companyId, id, "treasury");
    if (!payment && body.action === "pay") {
      record = repository.transition(config.wallet.companyId, id, "processing", ["draft", "processing"]);
      const intent = {
        id, idempotencyKey: id, companyId: config.wallet.companyId, walletId: config.wallet.id,
        recipient: record.recipient, amount: { symbol: "USDC" as const, decimals: 18 as const, baseUnits: parseAmount(record.amount).toString() }, purpose: record.kind === "reimbursement" ? "bill" as const : record.kind,
      };
      const execution = await treasury.payments.submit(intent);
      payment = { intent, execution };
    }
    if (!payment) return Response.json(record);
    const execution = ["processing", "submitted"].includes(payment.execution.status) ? await treasury.reconcile(payment.intent, payment.execution) : payment.execution;
    return Response.json(repository.transition(config.wallet.companyId, id, execution.status === "confirmed" ? "paid" : execution.status, pending, execution.transactionHash ? { transactionHash: execution.transactionHash } : {}));
  } catch (error) {
    if (treasury && !treasury.repository.find(id, config.wallet.companyId)) {
      const record = repository.get(config.wallet.companyId, id);
      if (record?.status === "processing" && record.kind !== "invoice") repository.transition(config.wallet.companyId, id, "draft", ["processing"]);
    }
    const reserved = treasury?.repository.find(id, config.wallet.companyId);
    return Response.json({ error: reserved ? "Payment submission is unresolved; refresh its status before taking further action" : error instanceof Error ? error.message : "Business action did not complete; refresh before retrying" }, { status: 409 });
  } finally { treasury?.close(); repository.close(); links.close(); }
}
