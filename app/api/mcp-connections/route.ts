import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openMcpConnections, discoverMcp } from "@/services/server/mcp-connections";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function handle(request: Request) {
  try { const principal = requireOperatorSession(request); if (principal.role !== "OWNER") throw new Error(); if (request.method !== "GET") requireSameOrigin(request); }
  catch { return Response.json({ error: "Company owner authorization is required" }, { status: 403, headers }); }
  const store = openMcpConnections();
  try {
    const company = readTreasuryConfiguration().wallet.companyId;
    if (request.method === "GET") return Response.json(store.list(company), { headers });
    const raw = await request.text(); if (raw.length > 20000) throw new Error("Connection request is too large");
    const body = JSON.parse(raw);
    if (body.action === "delete" && typeof body.id === "string") { store.remove(company, body.id); return Response.json({ removed: true }, { headers }); }
    if (body.action === "discover") {
      const connection = store.get(company, body.id); if (!connection) throw new Error("Connection not found");
      try { return Response.json(store.discover(company, connection, await discoverMcp(connection)), { headers }); }
      catch { return Response.json({ error: "Could not discover MCP tools. Check the endpoint, server access and token configuration." }, { status: 400, headers }); }
    }
    if (body.action !== "save") throw new Error("Unknown connection action");
    return Response.json(store.save(company, body.connection), { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Connection could not be saved" }, { status: 400, headers }); }
  finally { store.close(); }
}
export const GET = handle;
export const POST = handle;
