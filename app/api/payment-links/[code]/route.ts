import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openPaymentLinks } from "@/services/server/payment-links";

export const runtime = "nodejs";
type Context = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: Context) {
  const { code } = await context.params;
  const repository = openPaymentLinks();
  try {
    const link = repository.get(code);
    if (!link) return Response.json({ error: "Payment link not found" }, { status: 404 });
    return Response.json({ ...link, records: [] });
  } finally { repository.close(); }
}

export async function PATCH(request: Request, context: Context) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const { code } = await context.params;
  const repository = openPaymentLinks();
  try { return Response.json(repository.update(code, await request.json())); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Payment link was not updated" }, { status: 400 }); }
  finally { repository.close(); }
}
