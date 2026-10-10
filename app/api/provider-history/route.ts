import { requireOperatorSession } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openProviderHistory } from "@/services/server/provider-history";
import { workspaceEntity } from "@/types/seeded-workspace";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try { requireOperatorSession(request); } catch { return Response.json({ error: "Sign in to your workspace" }, { status: 401 }); }
  const repository = openProviderHistory();
  try {
    const entity = workspaceEntity(new URL(request.url).searchParams.get("entity") || "entity-3");
    return Response.json(repository.get(readTreasuryConfiguration().wallet.companyId, entity), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "History is unavailable" }, { status: 400 }); }
  finally { repository.close(); }
}
