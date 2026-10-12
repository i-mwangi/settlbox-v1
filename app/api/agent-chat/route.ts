import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openAgentChat, validateChatInput, answerFinanceMessage } from "@/services/server/agent-chat";
import { prepareAgentPlan } from "@/services/server/prepare-agent-plan";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  try {
    const principal = requireOperatorSession(request);
    const repository = openAgentChat();
    try { return Response.json(repository.list(readTreasuryConfiguration().wallet.companyId, principal.id), { headers }); }
    finally { repository.close(); }
  } catch { return Response.json({ error: "Conversation is unavailable. Sign in again." }, { status: 401, headers }); }
}
export async function POST(request: Request) {
  let principal;
  try { principal = requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401, headers }); }
  if (!["OWNER", "ADMIN"].includes(principal.role)) return Response.json({ error: "Owner or admin access is required" }, { status: 403, headers });
  const repository = openAgentChat();
  try {
    const raw = await request.text();
    if (raw.length > 12000) throw new Error("Message is too large");
    const input = validateChatInput(JSON.parse(raw));
    const company = readTreasuryConfiguration().wallet.companyId;
    const existing = repository.find(company, principal.id, input);
    if (existing) return Response.json(existing, { headers });
    const run = await prepareAgentPlan({ requestId: input.requestId, throughDate: input.throughDate, reserveUsdc: input.reserveUsdc }, principal.id, false);
    const answer = await answerFinanceMessage(input.message, repository.list(company, principal.id), run);
    return Response.json(repository.save(company, principal.id, input, answer.answer, run, answer.recordIds), { status: 201, headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Chat is unavailable" }, { status: 400, headers }); }
  finally { repository.close(); }
}
