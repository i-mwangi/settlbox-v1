import { openGiftEscrow } from "@/services/server/gift-escrow";

export const runtime = "nodejs";
export async function GET() {
  try { return Response.json((await openGiftEscrow()).config, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Arc Testnet gift escrow is unavailable" }, { status: 503 }); }
}
