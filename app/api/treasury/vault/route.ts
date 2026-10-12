import { requireOperatorSession } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { readTreasuryVaultStatus } from "@/services/server/treasury-vault";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  try {
    const status = await readTreasuryVaultStatus(readTreasuryConfiguration().wallet.companyId);
    return Response.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The configured treasury vault could not be verified. Agent execution remains disabled." }, { status: 503 });
  }
}
