import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openBusinessRecords } from "@/services/server/business-records";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  const repository = openBusinessRecords();
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || !("id" in input) || typeof input.id !== "string" || !("payments" in input)) throw new Error("Batch ID and payments are required");
    return Response.json(repository.createBatch(readTreasuryConfiguration().wallet.companyId, input.id, input.payments), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Batch could not be saved" }, { status: 400 }); }
  finally { repository.close(); }
}
