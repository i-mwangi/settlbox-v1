import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openBusinessRecords } from "@/services/server/business-records";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openPaymentLinks } from "@/services/server/payment-links";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const repository = openBusinessRecords();
  const links = openPaymentLinks();
  try {
    const companyId = readTreasuryConfiguration().wallet.companyId;
    const records = repository.list(companyId).map(record => {
      if (record.kind !== "invoice" || record.status !== "issued" || !record.paymentLinkCode) return record;
      const settlement = links.get(record.paymentLinkCode)?.records[0];
      return settlement ? repository.transition(companyId, record.id, "paid", ["issued"], { transactionHash: settlement.txid }) : record;
    });
    return Response.json(records, { headers: { "Cache-Control": "no-store" } });
  } finally { links.close(); repository.close(); }
}

export async function POST(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const repository = openBusinessRecords();
  try {
    const config = readTreasuryConfiguration();
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "kind" in body && body.kind === "invoice" && "recipient" in body && body.recipient !== config.wallet.address) throw new Error("Invoices must collect into the company treasury wallet");
    return Response.json(repository.create(config.wallet.companyId, body, request.headers.get("Idempotency-Key") || undefined), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Business record was not created" }, { status: 400 }); }
  finally { repository.close(); }
}
