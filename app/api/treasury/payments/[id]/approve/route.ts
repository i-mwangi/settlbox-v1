import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openTreasury } from "@/services/server/treasury-runtime";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let approver: string;
  try { approver = requireOperatorSession(request).id; requireSameOrigin(request); }
  catch { return Response.json({ error: "Request is not authorized" }, { status: 401 }); }
  let treasury: Awaited<ReturnType<typeof openTreasury>> | undefined;
  try {
    const { id } = await context.params;
    treasury = await openTreasury();
    const companyId = treasury.config.wallet.companyId;
    const payment = treasury.repository.find(id, companyId);
    if (!payment) return Response.json({ error: "Payment not found" }, { status: 404 });
    if (payment.execution.status !== "awaiting_approval") return Response.json({ error: "Payment is not awaiting approval" }, { status: 409 });
    treasury.repository.approve(id, companyId, approver);
    const execution = await treasury.payments.submit(payment.intent);
    return Response.json({ intent: payment.intent, execution });
  } catch { return Response.json({ error: "Approval did not complete; refresh payment status" }, { status: 409 }); }
  finally { treasury?.close(); }
}
