import { timingSafeEqual } from "node:crypto";
import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openFinanceWorker, runFinanceWorker } from "@/services/server/finance-worker";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
function workerAuthorized(request: Request) {
  const expected = process.env.SETTLBOX_FINANCE_WORKER_TOKEN;
  if (!expected || expected.length < 32) return false;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  return Buffer.byteLength(supplied) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
export async function GET(request: Request) {
  try { const principal = requireOperatorSession(request); if (principal.role !== "OWNER") return Response.json({ error: "Owner access is required" }, { status: 403, headers }); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401, headers }); }
  const store = openFinanceWorker();
  try { const company = readTreasuryConfiguration().wallet.companyId; return Response.json({ config: store.config(company), events: store.history(company), runnerConfigured: Boolean(process.env.SETTLBOX_FINANCE_WORKER_TOKEN && process.env.SETTLBOX_FINANCE_WORKER_TOKEN.length >= 32) }, { headers }); } finally { store.close(); }
}
export async function POST(request: Request) {
  const worker = workerAuthorized(request); let actor = "finance-worker";
  if (!worker) {
    try { const principal = requireOperatorSession(request); requireSameOrigin(request); if (principal.role !== "OWNER") return Response.json({ error: "Owner access is required" }, { status: 403, headers }); actor = principal.id; }
    catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401, headers }); }
  }
  try {
    const { action, settings } = await request.json(); const company = readTreasuryConfiguration().wallet.companyId;
    if (action === "tick") return Response.json(await runFinanceWorker(company), { headers });
    if (action !== "configure" || worker) return Response.json({ error: "Only the company owner can change automation settings" }, { status: 403, headers });
    const store = openFinanceWorker();
    try { return Response.json(store.configure(company, settings, actor), { headers }); } finally { store.close(); }
  } catch(error) { return Response.json({ error: error instanceof Error ? error.message : "Automation action failed" }, { status: 409, headers }); }
}
