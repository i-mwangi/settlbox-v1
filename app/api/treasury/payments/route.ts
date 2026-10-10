import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openTreasury } from "@/services/server/treasury-runtime";
import { parseAmount } from "@/services/arc/amount";
import type { EvmAddress, PaymentIntent } from "@/types/finance";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Request is not authorized" }, { status: 401 }); }
  let treasury: Awaited<ReturnType<typeof openTreasury>> | undefined;
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("recipient" in body) || !("amount" in body) || typeof body.recipient !== "string" || typeof body.amount !== "string") {
      return Response.json({ error: "Recipient and decimal amount are required" }, { status: 400 });
    }
    const key = request.headers.get("Idempotency-Key");
    if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
      return Response.json({ error: "A UUID v4 idempotency key is required" }, { status: 400 });
    }
    const amount = parseAmount(body.amount);
    if (amount % 1000000000000n !== 0n) return Response.json({ error: "Company USDC payments support up to six decimal places" }, { status: 400 });
    const baseUnits = amount.toString();
    treasury = await openTreasury();
    const intent: PaymentIntent = {
      id: key, idempotencyKey: key, companyId: treasury.config.wallet.companyId, walletId: treasury.config.wallet.id,
      recipient: body.recipient as EvmAddress, amount: { symbol: "USDC", decimals: 18, baseUnits }, purpose: "transfer",
    };
    const execution = await treasury.payments.submit(intent);
    return Response.json({ intent, execution }, { status: execution.status === "awaiting_approval" ? 202 : 200 });
  } catch { return Response.json({ error: "Payment was not completed. Refresh its status before retrying; a reservation may remain active." }, { status: 409 }); }
  finally { treasury?.close(); }
}
