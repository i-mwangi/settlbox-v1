import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openInboundMcp } from "@/services/server/inbound-mcp";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function handle(request: Request) {
  let principal; try { principal = requireOperatorSession(request); if (principal.role !== "OWNER") throw new Error(); if (request.method !== "GET") requireSameOrigin(request); }
  catch { return Response.json({ error: "Owner authorization required" }, { status: 403, headers }); }
  const company = readTreasuryConfiguration().wallet.companyId; const store = openInboundMcp();
  try {
    if (principal.companyId && principal.companyId !== company) return Response.json({ error: "Company mismatch" }, { status: 403, headers });
    if (request.method === "GET") return Response.json({ credentials: store.list(company, principal.id), events: store.events(company, principal.id) }, { headers });
    const raw = await request.text(); if (raw.length > 2000) throw new Error("Request too large"); const body = JSON.parse(raw);
    if (body.action === "create" && Object.keys(body).every(key => ["action", "name", "scopes"].includes(key))) return Response.json(store.create(company, principal.id, body.name, body.scopes, principal.memberId), { headers });
    if (body.action === "revoke" && typeof body.id === "string" && Object.keys(body).every(key => ["action", "id"].includes(key))) { store.revoke(company, principal.id, body.id); return Response.json({ revoked: true }, { headers }); }
    throw new Error("Unsupported credential action");
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Credential action failed" }, { status: 400, headers }); }
  finally { store.close(); }
}
export const GET = handle; export const POST = handle;
