import { timingSafeEqual } from "node:crypto";
import { runPayoutReconciliation } from "@/services/server/payout-reconciliation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const expected = process.env.SETTLBOX_PAYOUT_STATUS_TOKEN || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const headers = { "Cache-Control": "no-store" };
  if (expected.length < 32 || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) return Response.json({ error: "Status worker authorization is required" }, { status: 401, headers });
  // This credential grants only bounded status checks, never submission or configuration.
  try { return Response.json(await runPayoutReconciliation(), { headers }); }
  catch { return Response.json({ error: "Payout status checks could not complete" }, { status: 503, headers }); }
}
