import { resolve } from "node:path";
import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { saveReceiptImage, validateReceiptImage } from "@/services/server/receipt-images";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { requireOperatorSession(request); requireSameOrigin(request); } catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401 }); }
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
    const format = await validateReceiptImage(bytes, file.type);
    const directory = resolve(process.env.SETTLBOX_UPLOAD_DIRECTORY || ".data/uploads");
    const name = saveReceiptImage(directory, readTreasuryConfiguration().wallet.companyId, bytes, format);
    return Response.json({ url: `/api/uploads/${name}`, fileName: name, fileSize: bytes.length, mimeType: `image/${format}`, storagePath: "workspace", uploadedAt: new Date().toISOString() }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Image could not be uploaded" }, { status: 400 }); }
}
