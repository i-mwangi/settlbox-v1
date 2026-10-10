import { requireOperatorSession } from "@/services/server/operator-session";
import { openEmailOutbox } from "@/services/server/email-outbox";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { workspaceEntity } from "@/types/seeded-workspace";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Sign in to view delivery status" }, { status: 401 }); }
  const repository = openEmailOutbox();
  try {
    const entity = workspaceEntity(new URL(request.url).searchParams.get("entity") || "entity-3");
    return Response.json({ deliveryConfigured: false, messages: repository.list(readTreasuryConfiguration().wallet.companyId, entity) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Outbox unavailable" }, { status: 400 }); }
  finally { repository.close(); }
}
