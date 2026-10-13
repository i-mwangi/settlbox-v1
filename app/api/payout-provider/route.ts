import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openKoraSandbox, listKoraDestinations, payoutMarkets } from "@/services/server/kora-sandbox";
import { openFiatPayouts, createFiatRecipient, verifyFiatRecipient, credentialHash, submitFiatPayout, refreshFiatPayout } from "@/services/server/fiat-payouts";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function handle(request: Request) {
  let principal;
  try { principal = requireOperatorSession(request); if (principal.role !== "OWNER") throw new Error(); if (request.method !== "GET") requireSameOrigin(request); }
  catch { return Response.json({ error: "Company owner authorization is required" }, { status: 403, headers }); }
  const store = openKoraSandbox();
  const payouts = openFiatPayouts();
  try {
    const company = readTreasuryConfiguration().wallet.companyId;
    if (request.method === "GET") return Response.json({ connection: store.get(company), markets: payoutMarkets, liveEnabled: false, statusWorkerConfigured: Boolean(process.env.SETTLBOX_PAYOUT_STATUS_TOKEN && process.env.SETTLBOX_PAYOUT_STATUS_TOKEN.length >= 32), recipients: payouts.recipients(company), payouts: payouts.list(company), events: payouts.events(company) }, { headers });
    const raw = await request.text(); if (raw.length > 2000) throw new Error("Request is too large");
    const body = JSON.parse(raw);
    if (body.action === "save") return Response.json(store.save(company, body.keyEnv), { headers });
    if (body.action === "disconnect") { store.remove(company); return Response.json({ disconnected: true }, { headers }); }
    if (body.action === "destinations") {
      const keyEnv = store.verify(company);
      return Response.json(await listKoraDestinations(keyEnv, body.country, body.channel), { headers });
    }
    if (body.action === "cancel") {
      const payout = payouts.stored(company, String(body.id));
      if (!payout || payout.principal !== principal.id || payout.status !== "pending_review") throw new Error("Only your unsubmitted payout can be cancelled");
      return Response.json(payouts.public(payouts.update(company, payout, { status: "cancelled" }, principal.id, "Owner cancelled sandbox payout")), { headers });
    }
    const keyEnv = store.verify(company);
    if (body.action === "recipient") return Response.json(await createFiatRecipient(payouts, company, keyEnv, body.recipient, request.headers.get("Idempotency-Key") || undefined), { headers });
    if (body.action === "verify") return Response.json(await verifyFiatRecipient(payouts, company, keyEnv, String(body.id)), { headers });
    if (body.action === "prepare") return Response.json(payouts.prepare(company, principal.id, request.headers.get("Idempotency-Key") || String(body.requestId || ""), String(body.recipientId), body.amount, body.narration, credentialHash(keyEnv)), { headers });
    if (body.action === "submit") {
      if (body.confirmSandbox !== true || Object.keys(body).some(key => !["action", "id", "confirmSandbox"].includes(key))) throw new Error("Review and explicitly authorize this saved sandbox payout");
      return Response.json(await submitFiatPayout(payouts, company, principal.id, keyEnv, String(body.id)), { headers });
    }
    if (body.action === "status") return Response.json(await refreshFiatPayout(payouts, company, principal.id, keyEnv, String(body.id)), { headers });
    throw new Error("Unknown sandbox payout action");
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Provider request failed" }, { status: 400, headers }); }
  finally { payouts.close(); store.close(); }
}
export const GET = handle;
export const POST = handle;
