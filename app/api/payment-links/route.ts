import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openPaymentLinks } from "@/services/server/payment-links";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const repository = openPaymentLinks();
  try { return Response.json(repository.list()); }
  finally { repository.close(); }
}

export async function POST(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const repository = openPaymentLinks();
  try { return Response.json(repository.create(await request.json()), { status: 201 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Payment link was not created" }, { status: 400 }); }
  finally { repository.close(); }
}

export async function DELETE(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const repository = openPaymentLinks();
  try {
    const codes: unknown = await request.json();
    if (!Array.isArray(codes) || codes.length > 500 || !codes.every(code => typeof code === "string")) throw new Error("Payment link codes are required");
    const deletedCount = repository.delete(codes);
    return Response.json({ message: "Payment links deleted", deletedCount });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Payment links were not deleted" }, { status: 400 }); }
  finally { repository.close(); }
}

export async function PATCH(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const repository = openPaymentLinks();
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("linkIds" in body) || !Array.isArray(body.linkIds) || body.linkIds.length > 500 || !body.linkIds.every(Number.isSafeInteger)) throw new Error("Payment link IDs are required");
    repository.reorder(body.linkIds);
    return Response.json({ message: "Payment link order saved" });
  } catch { return Response.json({ error: "Payment link order was not saved" }, { status: 400 }); }
  finally { repository.close(); }
}
