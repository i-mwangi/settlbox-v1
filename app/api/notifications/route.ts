import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openNotifications } from "@/services/server/notifications";
import { openBusinessRecords } from "@/services/server/business-records";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const notifications = openNotifications();
  const records = openBusinessRecords();
  try {
    const companyId = readTreasuryConfiguration().wallet.companyId;
    const events = records.list(companyId).filter(record => ["issued", "paid", "awaiting_approval", "failed"].includes(record.status)).map(record => ({ key: `${record.id}:${record.status}`, title: `${record.kind.charAt(0).toUpperCase() + record.kind.slice(1)} ${record.status.replaceAll("_", " ")}`, message: `${record.title} · ${record.amount} USDC · ${record.counterparty}`, actionUrl: record.kind === "invoice" ? "/invoice" : "/transactions" }));
    notifications.publish(companyId, events);
    return Response.json(notifications.list(companyId), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Notifications are unavailable" }, { status: 503 }); }
  finally { records.close(); notifications.close(); }
}

export async function PATCH(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const notifications = openNotifications();
  try {
    const input: unknown = await request.json();
    if (typeof input !== "object" || input === null || !("action" in input)) throw new Error("Notification action is required");
    const companyId = readTreasuryConfiguration().wallet.companyId;
    if (input.action === "readAll") return Response.json({ updatedCount: notifications.markRead(companyId) });
    if (!["read", "unread", "delete"].includes(String(input.action)) || !("id" in input) || typeof input.id !== "number" || !Number.isSafeInteger(input.id) || input.id < 1) throw new Error("A valid notification ID is required");
    return Response.json({ updatedCount: input.action === "delete" ? notifications.delete(companyId, input.id) : input.action === "unread" ? notifications.markUnread(companyId, input.id) : notifications.markRead(companyId, input.id) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Notification was not updated" }, { status: 400 }); }
  finally { notifications.close(); }
}
