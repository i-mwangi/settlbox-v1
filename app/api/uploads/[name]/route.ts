import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireOperatorSession } from "@/services/server/operator-session";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ name: string }> }) {
  try { requireOperatorSession(request); } catch { return new Response("Workspace sign-in is required", { status: 401 }); }
  const { name } = await context.params;
  if (!/^[0-9a-f-]{36}\.(png|jpeg)$/.test(name)) return new Response("Image not found", { status: 404 });
  try { const bytes = readFileSync(resolve(process.env.SETTLBOX_UPLOAD_DIRECTORY || ".data/uploads", name)); return new Response(new Uint8Array(bytes), { headers: { "Content-Type": name.endsWith(".png") ? "image/png" : "image/jpeg", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } }); }
  catch { return new Response("Image not found", { status: 404 }); }
}
