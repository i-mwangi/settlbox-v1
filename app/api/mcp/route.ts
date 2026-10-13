import { createHash } from "node:crypto";
import { openInboundMcp } from "@/services/server/inbound-mcp";
import { inboundActions, inboundRpc, inboundOriginAllowed } from "@/services/server/inbound-mcp-protocol";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openBusinessRecords } from "@/services/server/business-records";
import { openReimbursements } from "@/services/server/reimbursements";
import { openAgentProposals } from "@/services/server/agent-proposals";
import { agentToolCatalog, validateAgentOperation } from "@/services/server/agent-tools";
import { openTeamMembers } from "@/services/server/team-members";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function handle(request: Request) {
  const config = readTreasuryConfiguration(); const store = openInboundMcp();
  try {
    if (!inboundOriginAllowed(request.headers.get("origin"), process.env.SETTLBOX_APP_ORIGIN, process.env.PORT)) return Response.json({ error: "Origin rejected" }, { status: 403, headers });
    let credential;
    try { const bearer = /^Bearer (sbmcp_[a-f0-9]{64})$/i.exec(request.headers.get("authorization") || ""); if (!bearer) throw new Error(); credential = store.authenticate(bearer[1], config.wallet.companyId);
      if (credential.memberId) { const members = openTeamMembers(); try { const member = members.get(credential.company, credential.memberId); if (!member || member.status !== "ACTIVE" || member.role !== "OWNER") throw new Error(); } finally { members.close(); } }
    }
    catch { return Response.json({ error: "MCP bearer credential required" }, { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } }); }
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
    try { store.consume(credential.id); } catch { return Response.json({ error: "Rate limit" }, { status: 429, headers }); }
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return new Response(null, { status: 415, headers });
    const reader = request.body?.getReader(); if (!reader) return new Response(null, { status: 400, headers });
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 65536) { await reader.cancel(); return new Response(null, { status: 413, headers }); } chunks.push(chunk.value); }
    let message; try { message = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers }); }
    const version = request.headers.get("mcp-protocol-version");
    if (version && !["2025-11-25", "2025-06-18", "2025-03-26"].includes(version)) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Use MCP protocol 2025-11-25" } }, { status: 400, headers });
    const proposals = openAgentProposals(); const records = openBusinessRecords(); const expenses = openReimbursements();
    try {
      const result = await inboundRpc(message, credential, async (name, args) => {
        store.audit(credential.id, name);
        if (["settlbox_list_records", "settlbox_action_catalog"].includes(name) && Object.keys(args).length) throw new Error("No arguments allowed");
        if (name === "settlbox_list_records") return { companyWallet: config.wallet.address, chainId: config.wallet.chainId, records: records.list(credential.company).slice(0, 50), limit: 50 };
        if (name === "settlbox_action_catalog") return agentToolCatalog.filter(tool => inboundActions.includes(tool.name));
        if (name === "settlbox_proposal_status") {
          if (typeof args.id !== "string" || Object.keys(args).some(key => key !== "id") || !store.owns(credential.id, args.id)) throw new Error("Proposal unavailable");
          return proposals.get(credential.company, credential.principal, args.id);
        }
        if (name !== "settlbox_propose_action" || Object.keys(args).some(key => !["tool", "arguments", "requestId"].includes(key)) || typeof args.requestId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(args.requestId) || !inboundActions.includes(String(args.tool))) throw new Error("Unsupported request");
        const operation = validateAgentOperation({ tool: args.tool, arguments: args.arguments });
        if (operation.tool === "business.create" && operation.arguments.kind === "invoice" && operation.arguments.recipient !== config.wallet.address) throw new Error("Invoice must collect to company wallet");
        const payload = JSON.stringify(operation); const previous = store.request(credential.id, args.requestId, payload);
        if (previous) return proposals.get(credential.company, credential.principal, previous);
        let before: unknown = null; let target: unknown = null;
        if (operation.tool.startsWith("business.") && operation.tool !== "business.create") before = target = records.get(credential.company, String(operation.arguments.id));
        if (["expense.review", "expense.prepare"].includes(operation.tool)) before = target = expenses.get(credential.company, "entity-3", String(operation.arguments.id));
        if (operation.tool === "payment.review") {
          const record = records.get(credential.company, String(operation.arguments.recordId));
          if (!record || record.kind === "invoice" || record.status !== "draft") throw new Error("Choose an unpaid saved payable"); before = record;
        }
        if (target === undefined) throw new Error("Record not found");
        const proposal = proposals.prepare(credential.company, credential.principal, `mcp:${credential.id}:${args.requestId}`, { ...operation, precondition: createHash("sha256").update(JSON.stringify(target)).digest("hex") }, before);
        store.link(credential.id, args.requestId, payload, proposal.id);
        return { id: proposal.id, status: proposal.status, operation: proposal.operation, expiresAt: proposal.expiresAt, reviewPath: "/agent", message: "Owner review required in Settlbox. Nothing was authorized or paid." };
      });
      return result === null ? new Response(null, { status: 202, headers }) : Response.json(result, { headers });
    } finally { proposals.close(); records.close(); expenses.close(); }
  } catch { return Response.json({ error: "MCP unavailable" }, { status: 503, headers }); }
  finally { store.close(); }
}
export const POST = handle; export const GET = handle; export const DELETE = handle;
