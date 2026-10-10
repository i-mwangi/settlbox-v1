import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { TeamMemberResponseDto } from "../../types/dto/team-member";
import type { TeamMemberRoleEnum } from "../../types/enums";

export interface WorkspaceMember extends TeamMemberResponseDto { email: string; walletAddress: string | null; companyKey: string }
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function role(value: unknown): TeamMemberRoleEnum { if (value !== "ADMIN" && value !== "REVIEWER" && value !== "VIEWER") throw new Error("Select Admin, Reviewer, or Viewer"); return value; }
function text(value: unknown, label: string, required = false) { if (value === undefined && !required) return ""; if (typeof value !== "string" || value.length > 160 || (required && !value.trim())) throw new Error(`Invalid ${label}`); return value.trim(); }

export class TeamMemberRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS workspace_members(id INTEGER PRIMARY KEY AUTOINCREMENT,company_id TEXT NOT NULL,record TEXT NOT NULL,token_hash TEXT UNIQUE,expires_at INTEGER,wallet TEXT); CREATE UNIQUE INDEX IF NOT EXISTS member_wallet ON workspace_members(company_id,wallet) WHERE wallet IS NOT NULL; CREATE TABLE IF NOT EXISTS workspace_challenges(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,member_id INTEGER NOT NULL,address TEXT NOT NULL,purpose TEXT NOT NULL,message TEXT NOT NULL,expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS challenge_expiration ON workspace_challenges(expires_at);");
  }
  list(companyId: string): WorkspaceMember[] { return this.database.prepare("SELECT record FROM workspace_members WHERE company_id=? ORDER BY id LIMIT 1000").all(companyId).map(row => JSON.parse(String(row.record)) as WorkspaceMember); }
  get(companyId: string, id: number): WorkspaceMember | undefined { const row = this.database.prepare("SELECT record FROM workspace_members WHERE company_id=? AND id=?").get(companyId, id); return row ? JSON.parse(String(row.record)) as WorkspaceMember : undefined; }
  invite(companyId: string, value: unknown): { member: WorkspaceMember; token: string } {
    if (!value || typeof value !== "object") throw new Error("Invitation details are required");
    const input = value as Record<string, unknown>;
    const email = text(input.email, "email", true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email is required");
    const now = new Date().toISOString();
    const member: WorkspaceMember = { id: 0, uuid: randomUUID(), companyId: 1, companyKey: companyId, firstName: text(input.firstName, "first name", true), lastName: text(input.lastName, "last name"), email, position: text(input.position, "position"), role: role(input.role), status: "PENDING", walletAddress: null, createdAt: now, updatedAt: now, invitedAt: now };
    const token = randomBytes(32).toString("hex");
    this.database.exec("BEGIN IMMEDIATE");
    try {
      if (this.list(companyId).some(existing => existing.email === email)) throw new Error("This email already belongs to a team member");
      member.id = Number(this.database.prepare("INSERT INTO workspace_members(company_id,record,token_hash,expires_at) VALUES(?,?,?,?)").run(companyId, "{}", digest(token), Date.now() + 7 * 86400000).lastInsertRowid);
      this.database.prepare("UPDATE workspace_members SET record=? WHERE id=?").run(JSON.stringify(member), member.id);
      this.database.exec("COMMIT");
      return { member, token };
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  update(companyId: string, id: number, value: unknown): WorkspaceMember {
    const member = this.get(companyId, id);
    if (!member || !value || typeof value !== "object") throw new Error("Team member not found");
    const input = value as Record<string, unknown>;
    const next = { ...member, firstName: input.firstName === undefined ? member.firstName : text(input.firstName, "first name", true), lastName: input.lastName === undefined ? member.lastName : text(input.lastName, "last name"), position: input.position === undefined ? member.position : text(input.position, "position"), role: input.role === undefined ? member.role : role(input.role), updatedAt: new Date().toISOString() };
    if (input.profilePicture !== undefined) { const picture = text(input.profilePicture, "profile picture"); if (!/^\/api\/uploads\/[0-9a-f-]{36}\.(png|jpeg)$/.test(picture)) throw new Error("Upload a profile picture first"); next.profilePicture = picture; }
    if (input.status !== undefined) { if (input.status !== "SUSPENDED" && !(input.status === "ACTIVE" && member.walletAddress)) throw new Error("A wallet invitation must be accepted before activation"); next.status = input.status; }
    const changed = this.database.prepare("UPDATE workspace_members SET record=? WHERE id=? AND company_id=? AND record=?").run(JSON.stringify(next), id, companyId, JSON.stringify(member));
    if (Number(changed.changes) !== 1) throw new Error("Member changed; refresh before editing");
    return next;
  }
  remove(companyId: string, id: number) { return { deleted: Number(this.database.prepare("DELETE FROM workspace_members WHERE company_id=? AND id=?").run(companyId, id).changes) }; }
  resend(companyId: string, id: number) {
    const member = this.get(companyId, id);
    if (!member || member.status !== "PENDING") throw new Error("Only pending invitations can be renewed");
    const token = randomBytes(32).toString("hex");
    this.database.prepare("UPDATE workspace_members SET token_hash=?,expires_at=? WHERE id=? AND company_id=?").run(digest(token), Date.now() + 7 * 86400000, id, companyId);
    this.database.prepare("DELETE FROM workspace_challenges WHERE member_id=? AND purpose='invite'").run(id);
    return { member, token };
  }
  challenge(companyId: string, address: string, origin: string, token?: string) {
    if (!/^0x[0-9a-f]{40}$/i.test(address) || /^0x0{40}$/i.test(address)) throw new Error("A valid wallet address is required");
    const normalized = address.toLowerCase();
    const row = token ? this.database.prepare("SELECT record FROM workspace_members WHERE company_id=? AND token_hash=? AND expires_at>?").get(companyId, digest(token), Date.now()) : this.database.prepare("SELECT record FROM workspace_members WHERE company_id=? AND wallet=?").get(companyId, normalized);
    if (!row) throw new Error("Invitation or wallet access is unavailable");
    const member = JSON.parse(String(row.record)) as WorkspaceMember;
    if (member.status !== (token ? "PENDING" : "ACTIVE")) throw new Error("Member access is unavailable");
    const id = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 300000;
    const purpose = token ? "invite" : "login";
    const message = `Settlbox workspace authorization\nOrigin: ${origin}\nCompany: ${companyId}\nWallet: ${normalized}\nPurpose: ${purpose}\nNonce: ${id}\nExpires: ${new Date(expiresAt).toISOString()}`;
    this.database.prepare("DELETE FROM workspace_challenges WHERE expires_at<?").run(Date.now());
    this.database.prepare("INSERT INTO workspace_challenges(id,company_id,member_id,address,purpose,message,expires_at) VALUES(?,?,?,?,?,?,?)").run(id, companyId, member.id, normalized, purpose, message, expiresAt);
    return { id, message, expiresAt };
  }
  readChallenge(companyId: string, id: string) { const row = this.database.prepare("SELECT * FROM workspace_challenges WHERE id=? AND company_id=? AND expires_at>?").get(id, companyId, Date.now()); if (!row) throw new Error("Wallet challenge expired or was already used"); return { address: String(row.address), message: String(row.message) }; }
  consumeChallenge(companyId: string, id: string): WorkspaceMember {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const row = this.database.prepare("SELECT * FROM workspace_challenges WHERE id=? AND company_id=? AND expires_at>?").get(id, companyId, Date.now());
      if (!row) throw new Error("Wallet challenge expired or was already used");
      const member = this.get(companyId, Number(row.member_id));
      if (!member || member.status !== (row.purpose === "invite" ? "PENDING" : "ACTIVE")) throw new Error("Member access is unavailable");
      const now = new Date().toISOString();
      const next: WorkspaceMember = { ...member, walletAddress: String(row.address), status: "ACTIVE", joinedAt: member.joinedAt || now, updatedAt: now, user: { id: member.id, email: member.email, publicKey: String(row.address) } };
      this.database.prepare("UPDATE workspace_members SET record=?,wallet=?,token_hash=NULL,expires_at=NULL WHERE id=? AND company_id=?").run(JSON.stringify(next), next.walletAddress, member.id, companyId);
      this.database.prepare("DELETE FROM workspace_challenges WHERE id=?").run(id);
      this.database.exec("COMMIT");
      return next;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  close() { this.database.close(); }
}
export function openTeamMembers() { const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite"); mkdirSync(dirname(path), { recursive: true }); return new TeamMemberRepository(path); }
