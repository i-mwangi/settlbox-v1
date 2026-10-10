import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { openTeamMembers } from "./team-members.ts";
import type { WorkspaceMember } from "./team-members.ts";

export interface WorkspacePrincipal { id: string; role: "OWNER" | "ADMIN" | "REVIEWER" | "VIEWER"; memberId?: number; companyId?: string; member?: WorkspaceMember }

const COOKIE_NAME = "settlbox_operator";
const SESSION_SECONDS = 3600;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getDatabase() {
  const path = resolve(process.env.SETTLBOX_SESSION_DATABASE || ".data/sessions.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS operator_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, principal TEXT); CREATE INDEX IF NOT EXISTS operator_expiration ON operator_sessions(expires_at)");
  if (!database.prepare("PRAGMA table_info(operator_sessions)").all().some(column => column.name === "principal")) {
    try { database.exec("ALTER TABLE operator_sessions ADD COLUMN principal TEXT"); }
    catch (error) { if (!database.prepare("PRAGMA table_info(operator_sessions)").all().some(column => column.name === "principal")) throw error; }
  }
  return database;
}

export function verifyOperatorToken(candidate: string): boolean {
  const expected = process.env.SETTLBOX_OPERATOR_TOKEN;
  if (!expected || expected.length < 32 || candidate.length > 256) return false;
  return timingSafeEqual(Buffer.from(hash(candidate)), Buffer.from(hash(expected)));
}

export function createOperatorSession(principal?: WorkspacePrincipal): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const database = getDatabase();
  try {
    database.prepare("DELETE FROM operator_sessions WHERE expires_at < ?").run(Date.now());
    database.prepare("INSERT INTO operator_sessions(token_hash,expires_at,principal) VALUES(?,?,?)").run(hash(token), expiresAt, principal ? JSON.stringify(principal) : null);
    return { token, expiresAt };
  } finally { database.close(); }
}

function readCookie(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map(item => item.trim()).find(item => item.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}

export function requireOperatorSession(request: Request, permission: "standard" | "profile" = "standard"): WorkspacePrincipal {
  if (process.env.NEXT_PUBLIC_ARC_ENVIRONMENT && process.env.NEXT_PUBLIC_ARC_ENVIRONMENT !== "testnet") throw new Error("Arc Testnet is required");
  const token = readCookie(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) throw new Error("Authentication required");
  const database = getDatabase();
  try {
    const row = database.prepare("SELECT expires_at,principal FROM operator_sessions WHERE token_hash=?").get(hash(token));
    if (!row || Number(row.expires_at) <= Date.now()) throw new Error("Authentication required");
    if (typeof row.principal !== "string") return { id: "workspace-operator", role: "OWNER" };
    const principal = JSON.parse(row.principal) as WorkspacePrincipal;
    if (!principal.memberId || !principal.companyId) throw new Error("Authentication required");
    const config = JSON.parse(readFileSync(resolve(process.env.SETTLBOX_TREASURY_CONFIG || ".data/treasury-config.json"), "utf8")) as { wallet: { companyId: string } };
    if (config.wallet.companyId !== principal.companyId) throw new Error("Authentication required");
    const members = openTeamMembers();
    try {
      const member = members.get(principal.companyId, principal.memberId);
      if (!member || member.status !== "ACTIVE") throw new Error("Authentication required");
      if (permission === "standard" && request.method !== "GET" && member.role !== "OWNER" && member.role !== "ADMIN" && !(member.role === "REVIEWER" && request.method === "POST" && /^\/api\/treasury\/payments\/[^/]+\/approve$/.test(new URL(request.url).pathname))) throw new Error("Workspace role does not permit this action");
      return { ...principal, role: member.role, member };
    } finally { members.close(); }
  } finally { database.close(); }
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const expected = process.env.SETTLBOX_APP_ORIGIN || `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (origin !== expected) throw new Error("Request origin is not authorized");
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function revokeOperatorSession(request: Request): void {
  const token = readCookie(request);
  if (!token) return;
  const database = getDatabase();
  try { database.prepare("DELETE FROM operator_sessions WHERE token_hash=?").run(hash(token)); }
  finally { database.close(); }
}
