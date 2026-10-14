import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type McpScope = "records:read" | "actions:propose";
export interface InboundCredential { id: string; company: string; principal: string; memberId?: number; resource?: string; name: string; scopes: McpScope[]; expiresAt: number; revoked: boolean }
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export class InboundMcpRepository {
  private db: DatabaseSync;
  private shared?: DatabaseSync;
  constructor(path: string, shared?: DatabaseSync) {
    this.shared = shared;
    mkdirSync(dirname(resolve(path)), { recursive: true }); this.db = shared || new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS inbound_mcp_credentials(id TEXT PRIMARY KEY,company TEXT,principal TEXT,hash TEXT UNIQUE,record TEXT); CREATE TABLE IF NOT EXISTS inbound_mcp_requests(credential TEXT,request TEXT,payload TEXT,proposal TEXT,PRIMARY KEY(credential,request)); CREATE TABLE IF NOT EXISTS inbound_mcp_audit(id INTEGER PRIMARY KEY,credential TEXT,event TEXT,at INTEGER); CREATE TABLE IF NOT EXISTS inbound_mcp_rate(credential TEXT PRIMARY KEY,minute INTEGER,count INTEGER)");
  }
  list(company: string, principal: string): InboundCredential[] { return this.db.prepare("SELECT record FROM inbound_mcp_credentials WHERE company=? AND principal=? ORDER BY rowid DESC").all(company, principal).map(row => JSON.parse(String(row.record))); }
  create(company: string, principal: string, name: string, scopes: McpScope[], memberId?: number, lifetime = 30 * 86400000, resource?: string) {
    if (!name?.trim() || name.length > 80 || !Array.isArray(scopes) || !scopes.length || scopes.some(scope => !["records:read", "actions:propose"].includes(scope))) throw new Error("Choose a name and supported scopes");
    if (this.list(company, principal).filter(row => !row.revoked && row.expiresAt > Date.now()).length >= 10) throw new Error("Revoke an existing credential first");
    const token = `sbmcp_${randomBytes(32).toString("hex")}`;
    const credential: InboundCredential = { id: randomUUID(), company, principal, memberId, resource, name: name.trim(), scopes: [...new Set(scopes)], expiresAt: Date.now() + lifetime, revoked: false };
    this.db.prepare("INSERT INTO inbound_mcp_credentials VALUES(?,?,?,?,?)").run(credential.id, company, principal, digest(token), JSON.stringify(credential)); this.audit(credential.id, "created");
    return { credential, token };
  }
  authenticate(token: string, company: string) {
    if (!/^sbmcp_[a-f0-9]{64}$/.test(token)) throw new Error("Unauthorized");
    const row = this.db.prepare("SELECT record FROM inbound_mcp_credentials WHERE hash=? AND company=?").get(digest(token), company);
    const credential: InboundCredential | undefined = row ? JSON.parse(String(row.record)) : undefined;
    if (!credential || credential.revoked || credential.expiresAt <= Date.now()) throw new Error("Unauthorized");
    return credential;
  }
  revoke(company: string, principal: string, id: string) {
    const row = this.list(company, principal).find(item => item.id === id); if (!row) throw new Error("Credential not found");
    this.db.prepare("UPDATE inbound_mcp_credentials SET record=? WHERE id=?").run(JSON.stringify({ ...row, revoked: true }), id); this.audit(id, "revoked");
  }
  consume(id: string, now = Date.now()) {
    const minute = Math.floor(now / 60000);
    this.db.prepare("INSERT INTO inbound_mcp_rate VALUES(?,?,1) ON CONFLICT(credential) DO UPDATE SET count=CASE WHEN minute=excluded.minute THEN count+1 ELSE 1 END,minute=excluded.minute").run(id, minute);
    if (Number(this.db.prepare("SELECT count FROM inbound_mcp_rate WHERE credential=?").get(id)!.count) > 120) throw new Error("Rate limit");
  }
  audit(id: string, event: string) { this.db.prepare("INSERT INTO inbound_mcp_audit(credential,event,at) VALUES(?,?,?)").run(id, event, Date.now()); this.db.prepare("DELETE FROM inbound_mcp_audit WHERE credential=? AND id NOT IN (SELECT id FROM inbound_mcp_audit WHERE credential=? ORDER BY id DESC LIMIT 1000)").run(id, id); }
  request(credential: string, request: string, payload: string) {
    const row = this.db.prepare("SELECT payload,proposal FROM inbound_mcp_requests WHERE credential=? AND request=?").get(credential, request);
    if (row && row.payload !== digest(payload)) throw new Error("Request ID already has different details"); return row ? String(row.proposal) : undefined;
  }
  link(credential: string, request: string, payload: string, proposal: string) { this.db.prepare("INSERT OR IGNORE INTO inbound_mcp_requests VALUES(?,?,?,?)").run(credential, request, digest(payload), proposal); }
  owns(credential: string, proposal: string) { return !!this.db.prepare("SELECT 1 FROM inbound_mcp_requests WHERE credential=? AND proposal=?").get(credential, proposal); }
  assertProposalActive(company: string, principal: string, proposal: string) {
    const rows = this.db.prepare("SELECT c.record FROM inbound_mcp_requests r JOIN inbound_mcp_credentials c ON c.id=r.credential WHERE r.proposal=?").all(proposal);
    if (rows.length && !rows.some(row => { const c: InboundCredential = JSON.parse(String(row.record)); return c.company === company && c.principal === principal && !c.revoked && c.expiresAt > Date.now(); })) throw new Error("The external MCP credential expired or was revoked. Dismiss this request.");
  }
  events(company: string, principal: string) { return this.db.prepare("SELECT a.event,a.at,c.id FROM inbound_mcp_audit a JOIN inbound_mcp_credentials c ON c.id=a.credential WHERE c.company=? AND c.principal=? ORDER BY a.id DESC LIMIT 30").all(company, principal); }
  close() { if (!this.shared) this.db.close(); }
}
export const openInboundMcp = () => new InboundMcpRepository(resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite"));
