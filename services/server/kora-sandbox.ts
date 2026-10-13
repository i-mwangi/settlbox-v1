import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const payoutMarkets = {
  KE: { currency: "KES", channels: ["bank_account", "mobile_money"] },
  NG: { currency: "NGN", channels: ["bank_account"] },
  GH: { currency: "GHS", channels: ["mobile_money"] },
} as const;
export function sandboxCredential(name: unknown, env: NodeJS.ProcessEnv = process.env) {
  if (typeof name !== "string" || !/^SETTLBOX_KORA_[A-Z0-9_]+_KEY$/.test(name)) throw new Error("Enter the server environment variable name for this company's Kora test key");
  const key = env[name];
  if (!key || !/^sk_test_[A-Za-z0-9_-]+$/.test(key)) throw new Error("A Kora test secret key is required. Live keys are disabled.");
  return key;
}
export class KoraSandboxRepository {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS kora_sandbox_accounts(company TEXT PRIMARY KEY, key_env TEXT NOT NULL, credential_hash TEXT UNIQUE NOT NULL)");
  }
  close() { this.db.close(); }
  get(company: string) {
    const row = this.db.prepare("SELECT key_env FROM kora_sandbox_accounts WHERE company=?").get(company);
    return row ? { keyEnv: String(row.key_env), mode: "sandbox" as const } : null;
  }
  verify(company: string) {
    const row = this.db.prepare("SELECT key_env,credential_hash FROM kora_sandbox_accounts WHERE company=?").get(company);
    if (!row) throw new Error("Connect this business's Kora sandbox account first");
    const key = sandboxCredential(row.key_env);
    if (createHash("sha256").update(key).digest("hex") !== row.credential_hash) throw new Error("The provider key changed. Save this business's sandbox connection again.");
    return String(row.key_env);
  }
  save(company: string, name: unknown, env: NodeJS.ProcessEnv = process.env) {
    const key = sandboxCredential(name, env);
    const hash = createHash("sha256").update(key).digest("hex");
    const owner = this.db.prepare("SELECT company FROM kora_sandbox_accounts WHERE credential_hash=?").get(hash);
    if (owner && owner.company !== company) throw new Error("This provider account is already assigned to another business");
    this.db.prepare("INSERT INTO kora_sandbox_accounts VALUES(?,?,?) ON CONFLICT(company) DO UPDATE SET key_env=excluded.key_env,credential_hash=excluded.credential_hash").run(company, String(name), hash);
    return this.get(company);
  }
  remove(company: string) { this.db.prepare("DELETE FROM kora_sandbox_accounts WHERE company=?").run(company); }
}
export function openKoraSandbox() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new KoraSandboxRepository(path);
}
export async function listKoraDestinations(keyEnv: string, country: string, channel: string): Promise<{ name: string; code: string; slug: string }[]> {
  if (!Object.hasOwn(payoutMarkets, country)) throw new Error("Choose Kenya, Nigeria or Ghana");
  const market = payoutMarkets[country as keyof typeof payoutMarkets];
  if (!(market.channels as readonly string[]).includes(channel)) throw new Error("This payout channel is not supported for the selected market");
  sandboxCredential(keyEnv);
  const publicKeyEnv = keyEnv.replace(/_KEY$/, "_PUBLIC_KEY");
  const key = process.env[publicKeyEnv];
  if (!key || !/^pk_test_[A-Za-z0-9_-]+$/.test(key)) throw new Error(`Save the matching Kora test public key as ${publicKeyEnv}. Destination discovery requires public-key authentication.`);
  const endpoint = channel === "bank_account" ? "banks" : "mobile-money";
  let response: Response;
  try { response = await fetch(`https://api.korapay.com/merchant/api/v1/misc/${endpoint}?countryCode=${country}`, { headers: { Authorization: `Bearer ${key}` }, redirect: "error", signal: AbortSignal.timeout(15000), cache: "no-store" }); }
  catch { throw new Error("Kora could not be reached. No payout was submitted."); }
  if (!response.ok) throw new Error("Kora rejected the connection. Check the test key and account access.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Kora returned an empty response");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 256000) { await reader.cancel(); throw new Error("Kora returned an oversized destination list"); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const raw = Buffer.concat(chunks).toString("utf8");
  const body = JSON.parse(raw);
  if (body.status !== true || !Array.isArray(body.data) || body.data.length > 2000) throw new Error("Kora returned an unexpected destination list");
  return body.data.map((item: Record<string, unknown>) => {
    if (typeof item.name !== "string" || typeof item.code !== "string" || typeof item.slug !== "string" || [item.name, item.code, item.slug].some(value => value.length > 200)) throw new Error("Kora returned an invalid destination");
    return { name: item.name, code: item.code, slug: item.slug };
  });
}
