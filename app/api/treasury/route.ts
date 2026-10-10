import { requireOperatorSession } from "@/services/server/operator-session";
import { openTreasury } from "@/services/server/treasury-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Authentication required" }, { status: 401 }); }
  let treasury: Awaited<ReturnType<typeof openTreasury>> | undefined;
  try {
    treasury = await openTreasury();
    const records = treasury.repository.list(treasury.config.wallet.companyId);
    const pending = records.filter(record => ["processing", "submitted"].includes(record.execution.status)).reverse().slice(0, 8);
    const updates = await Promise.all(pending.map(async record => ({ id: record.intent.id, execution: await treasury!.reconcile(record.intent, record.execution) })));
    const reconciled = new Map(updates.map(update => [update.id, update.execution]));
    const payments = records.map(record => ({ intent: record.intent, execution: reconciled.get(record.intent.id) || record.execution }));
    return Response.json({ wallet: treasury.config.wallet, balanceBaseUnits: treasury.balance, policy: treasury.config.policy, payments }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Treasury is unavailable; check server configuration and network access" }, { status: 503 }); }
  finally { treasury?.close(); }
}
