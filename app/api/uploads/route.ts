import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { requireOperatorSession(request, "profile"); requireSameOrigin(request); } catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("An image file is required");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) { const { value, done } = await reader.read(); if (done) break; total += value.byteLength; if (total > 2 * 1024 * 1024 + 65536) { await reader.cancel(); throw new Error("Image must be at most 2 MB"); } chunks.push(value); }
    const body = Buffer.concat(chunks);
    const form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") || "" }, body: new Uint8Array(body) }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > 2 * 1024 * 1024) throw new Error("A PNG or JPEG image of at most 2 MB is required");
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217;
    if ((!png || file.type !== "image/png") && (!jpeg || file.type !== "image/jpeg")) throw new Error("Only PNG and JPEG images are accepted");
    const name = `${randomUUID()}.${png ? "png" : "jpeg"}`;
    const directory = resolve(process.env.SETTLBOX_UPLOAD_DIRECTORY || ".data/uploads");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, name), bytes, { flag: "wx" });
    return Response.json({ url: `/api/uploads/${name}`, fileName: name, fileSize: bytes.length, mimeType: png ? "image/png" : "image/jpeg", storagePath: "workspace", uploadedAt: new Date().toISOString() }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Image could not be uploaded" }, { status: 400 }); }
}
