import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
export async function validateReceiptImage(bytes: Buffer, mimeType: string): Promise<"png" | "jpeg"> {
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error("A PNG or JPEG image of at most 2 MB is required");
  const format = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpeg" : null;
  if (!format) throw new Error("Only PNG and JPEG images are accepted");
  try {
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: MAX_PIXELS });
    const metadata = await image.metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height || (metadata.pages || 1) > 1) throw new Error("Invalid image");
    await image.raw().toBuffer();
    return format;
  } catch { throw new Error("Receipt image is corrupt or exceeds the image dimensions limit"); }
}

function companyDirectory(root: string, companyId: string) {
  if (!companyId) throw new Error("Company is required");
  return resolve(root, createHash("sha256").update(companyId).digest("hex"));
}
export function saveReceiptImage(root: string, companyId: string, bytes: Buffer, format: "png" | "jpeg") {
  const name = `${randomUUID()}.${format}`;
  const directory = companyDirectory(root, companyId);
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, name), bytes, { flag: "wx" });
  return name;
}
export function readReceiptImage(root: string, companyId: string, name: string, legacyCompanyId?: string) {
  if (!/^[0-9a-f-]{36}\.(png|jpeg)$/.test(name)) throw new Error("Image not found");
  try { return readFileSync(resolve(companyDirectory(root, companyId), name)); }
  catch {
    if (companyId !== legacyCompanyId) throw new Error("Image not found");
    const ownership = resolve(root, ".legacy-company");
    try { writeFileSync(ownership, companyId, { flag: "wx" }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    if (readFileSync(ownership, "utf8") !== companyId) throw new Error("Image not found");
    return readFileSync(resolve(root, name));
  }
}
