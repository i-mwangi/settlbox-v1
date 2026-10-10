import { scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";

export function verifyWorkspacePassword(email: unknown, password: unknown, address: string): boolean {
  if (typeof email !== "string" || typeof password !== "string" || email.length > 320 || password.length > 1024) return false;
  const expectedEmail = process.env.SETTLBOX_LOGIN_EMAIL;
  const encoded = process.env.SETTLBOX_LOGIN_PASSWORD_HASH;
  if (!expectedEmail || !encoded) throw new Error("Configure workspace email/password credentials locally first");
  const path = resolve(process.env.SETTLBOX_SESSION_DATABASE || ".data/sessions.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  const key = createHash("sha256").update(address).digest("hex");
  database.exec("CREATE TABLE IF NOT EXISTS login_attempts(id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL)");
  try {
    const now = Date.now();
    database.prepare("DELETE FROM login_attempts WHERE expires_at<?").run(now);
    const attempt = database.prepare("SELECT count FROM login_attempts WHERE id=?").get(key);
    if (attempt && Number(attempt.count) >= 10) throw new Error("Too many sign-in attempts. Try again in fifteen minutes");
    const [scheme, salt, digest] = encoded.split(":");
    if (scheme !== "scrypt" || !/^[0-9a-f]{32}$/.test(salt || "") || !/^[0-9a-f]{128}$/.test(digest || "")) throw new Error("Workspace password configuration is invalid");
    const candidate = scryptSync(password, salt, 64);
    const valid = timingSafeEqual(candidate, Buffer.from(digest, "hex")) && email.trim().toLowerCase() === expectedEmail.trim().toLowerCase();
    if (valid) database.prepare("DELETE FROM login_attempts WHERE id=?").run(key);
    else database.prepare("INSERT INTO login_attempts VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1").run(key, now + 900000);
    return valid;
  } finally { database.close(); }
}
