import { openGiftEscrow } from "@/services/server/gift-escrow";
import { validateGiftId } from "@/services/arc/gift-escrow";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try { validateGiftId(id); }
  catch { return Response.json({ error: "Invalid gift identifier" }, { status: 400 }); }
  try { return Response.json(await (await openGiftEscrow()).read(id), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error && error.message === "Gift not found" ? "Gift not found" : "Gift escrow is unavailable" }, { status: error instanceof Error && error.message === "Gift not found" ? 404 : 503 }); }
}
