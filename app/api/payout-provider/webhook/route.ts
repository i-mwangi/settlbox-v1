import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openKoraSandbox } from "@/services/server/kora-sandbox";
import { openFiatPayouts, validKoraWebhook, refreshFiatPayout } from "@/services/server/fiat-payouts";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const signature = request.headers.get("x-korapay-signature") || "";
  if (!/^[0-9a-f]{64}$/i.test(signature)) return Response.json({ error: "Invalid webhook signature" }, { status: 401, headers });
  const reader = request.body?.getReader(); if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > 16000) { await reader.cancel(); return new Response(null, { status: 413 }); } chunks.push(item.value); } } finally { reader.releaseLock(); }
  let payload;
  try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return new Response(null, { status: 400 }); }
  const connections = openKoraSandbox(); const payouts = openFiatPayouts();
  try {
    const company = readTreasuryConfiguration().wallet.companyId;
    const keyEnv = connections.verify(company);
    if (!validKoraWebhook(keyEnv, payload.data, signature)) return Response.json({ error: "Invalid webhook signature" }, { status: 401, headers });
    const reference = payload.data?.reference;
    if (typeof reference !== "string" || !/^sbx_[0-9a-f-]{36}$/.test(reference)) return Response.json({ received: true }, { headers });
    const id = reference.slice(4); const payout = payouts.stored(company, id);
    if (!payout || payout.reference !== reference) return Response.json({ received: true }, { headers });
    // A signed event is a signal to query Kora, never proof of successful delivery.
    await refreshFiatPayout(payouts, company, "kora-sandbox-webhook", keyEnv, id);
    return Response.json({ received: true }, { headers });
  } catch { return Response.json({ error: "Webhook reconciliation is pending" }, { status: 503, headers }); }
  finally { payouts.close(); connections.close(); }
}
