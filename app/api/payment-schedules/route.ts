import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openBusinessRecords } from "@/services/server/business-records";
import type { ScheduleStatus } from "@/types/recurring-payment";

export const runtime = "nodejs";

async function handle(request: Request) {
  try { requireOperatorSession(request); if (request.method !== "GET") requireSameOrigin(request); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  const repository = openBusinessRecords();
  try {
    const companyId = readTreasuryConfiguration().wallet.companyId;
    if (request.method === "GET") return Response.json(repository.listSchedules(companyId), { headers: { "Cache-Control": "no-store" } });
    const value: unknown = await request.json();
    if (!value || typeof value !== "object") throw new Error("Schedule details are required");
    if ("action" in value && value.action === "prepare" && request.method === "POST") return Response.json(repository.prepareDuePayments(companyId));
    if (!("id" in value) || typeof value.id !== "string") throw new Error("Schedule ID is required");
    if (request.method === "POST") return Response.json(repository.createSchedule(companyId, value.id, value), { status: 201 });
    if (!("status" in value) || typeof value.status !== "string") throw new Error("Schedule status is required");
    return Response.json(repository.setScheduleStatus(companyId, value.id, value.status as ScheduleStatus));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Schedule request failed" }, { status: 400 }); }
  finally { repository.close(); }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
