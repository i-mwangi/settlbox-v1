import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openPayrollContracts } from "@/services/server/payroll-contracts";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { workspaceEntity } from "@/types/seeded-workspace";

export const runtime = "nodejs";
async function handle(request: Request) {
  try { requireOperatorSession(request); if (request.method !== "GET") requireSameOrigin(request); }
  catch { return Response.json({ error: "Sign in to your workspace" }, { status: 401 }); }
  const repository = openPayrollContracts();
  try {
    const companyId = readTreasuryConfiguration().wallet.companyId;
    const entity = workspaceEntity(new URL(request.url).searchParams.get("entity") || "entity-3");
    if (request.method === "GET") return Response.json(repository.list(companyId, entity), { headers: { "Cache-Control": "no-store" } });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Contract request is required");
    const input = body as Record<string, unknown>;
    if (request.method === "POST") return Response.json(repository.save(companyId, entity, input), { status: 201 });
    if (input.action === "confirm" && typeof input.invoiceId === "string") {
      if (entity !== "entity-3") throw new Error("Connect a treasury before confirming payable invoices");
      return Response.json(repository.confirm(companyId, entity, input.invoiceId));
    }
    if (typeof input.id !== "number" || !Number.isSafeInteger(input.id)) throw new Error("Contract ID is required");
    if (input.action === "prepare") return Response.json(repository.prepare(companyId, entity, input.id, Number(input.period)));
    if (input.action === "pause" || input.action === "resume" || input.action === "cancel") return Response.json(repository.setStatus(companyId, entity, input.id, input.action === "pause" ? "PAUSED" : input.action === "resume" ? "ACTIVE" : "CANCELLED"));
    if (input.action !== "update") throw new Error("Unknown contract action");
    const patch = input.data;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Contract changes are required");
    const details = patch as Record<string, unknown>;
    return Response.json(repository.save(companyId, entity, { ...details, ...(details.paydayDay === undefined ? {} : { payday: details.paydayDay }) }, input.id));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Contract request failed" }, { status: 400 }); }
  finally { repository.close(); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
