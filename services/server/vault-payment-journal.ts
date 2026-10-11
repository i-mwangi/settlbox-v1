import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import type { BusinessRecord } from "../../types/business";
import { parseAmount } from "../arc/amount.ts";

export interface VaultPayment {
  id: `0x${string}`; companyId: string; recordId: string; runId: string; recipient: `0x${string}`; amount: string;
  expiresAt: string; createdAt: string; requestedBy: string;
  status: string; queueProviderId?: string; executeProviderId?: string; transactionHash?: `0x${string}`;
}
export function vaultPaymentId(company: string, vault: string, record: string): `0x${string}` {
  return `0x${createHash("sha256").update(JSON.stringify([company, vault.toLowerCase(), record])).digest("hex")}`;
}
export function vaultProviderKey(id: string, stage: string) {
  const h = createHash("sha256").update(JSON.stringify([id, stage])).digest("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export class VaultPaymentJournal {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS business_payment_routes(company_id TEXT NOT NULL,record_id TEXT NOT NULL,route TEXT NOT NULL,PRIMARY KEY(company_id,record_id)); CREATE TABLE IF NOT EXISTS vault_payments(company_id TEXT NOT NULL,record_id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(company_id,record_id)); CREATE TABLE IF NOT EXISTS vault_payment_events(id INTEGER PRIMARY KEY,company_id TEXT NOT NULL,payment_id TEXT NOT NULL,event TEXT NOT NULL,created_at TEXT NOT NULL)");
  }
  list(company: string): VaultPayment[] { return this.db.prepare("SELECT record FROM vault_payments WHERE company_id=? ORDER BY rowid DESC LIMIT 100").all(company).map(row => JSON.parse(String(row.record))); }
  get(company: string, recordId: string): VaultPayment | undefined { const row = this.db.prepare("SELECT record FROM vault_payments WHERE company_id=? AND record_id=?").get(company, recordId); return row ? JSON.parse(String(row.record)) : undefined; }
  reserved(company: string) {
    return this.db.prepare("SELECT record FROM vault_payments WHERE company_id=?").all(company).reduce((sum, row) => { const payment: VaultPayment = JSON.parse(String(row.record)); return ["paid", "cancelled", "expired", "policy_changed"].includes(payment.status) ? sum : sum + parseAmount(payment.amount); }, 0n);
  }
  reserve(payment: VaultPayment, capacity?: bigint) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.get(payment.companyId, payment.recordId);
      if (existing) { this.db.exec("COMMIT"); return existing; }
      if (capacity !== undefined && this.reserved(payment.companyId) + parseAmount(payment.amount) > capacity) throw new Error("Queued payments would consume reserved liquidity");
      const row = this.db.prepare("SELECT record FROM business_records WHERE company_id=? AND id=?").get(payment.companyId, payment.recordId);
      const record: BusinessRecord | undefined = row ? JSON.parse(String(row.record)) : undefined;
      if (!record || record.status !== "draft" || record.kind === "invoice" || record.recipient.toLowerCase() !== payment.recipient.toLowerCase() || record.amount !== payment.amount) throw new Error("Saved obligation changed or already has a payment workflow");
      const route = this.db.prepare("SELECT route FROM business_payment_routes WHERE company_id=? AND record_id=?").get(payment.companyId, payment.recordId);
      if (route && route.route !== "vault") throw new Error("Obligation is assigned to another payment route");
      this.db.prepare("INSERT OR IGNORE INTO business_payment_routes VALUES(?,?,'vault')").run(payment.companyId, payment.recordId);
      this.db.prepare("INSERT INTO vault_payments VALUES(?,?,?)").run(payment.companyId, payment.recordId, JSON.stringify(payment));
      this.db.prepare("UPDATE business_records SET record=? WHERE company_id=? AND id=?").run(JSON.stringify({ ...record, status: "awaiting_approval", updatedAt: new Date().toISOString() }), payment.companyId, payment.recordId);
      this.event(payment, "Reserved for vault settlement"); this.db.exec("COMMIT"); return payment;
    } catch(error) { this.db.exec("ROLLBACK"); throw error; }
  }
  patch(payment: VaultPayment, update: Partial<VaultPayment>, event: string) {
    const current = this.get(payment.companyId, payment.recordId);
    if (!current) throw new Error("Vault payment not found");
    const next = { ...current, ...update };
    const changed = this.db.prepare("UPDATE vault_payments SET record=? WHERE company_id=? AND record_id=? AND record=?").run(JSON.stringify(next), payment.companyId, payment.recordId, JSON.stringify(current));
    if (!changed.changes) throw new Error("Payment changed; refresh before retrying");
    this.event(next, event); return next;
  }
  event(payment: VaultPayment, event: string) { this.db.prepare("INSERT INTO vault_payment_events(company_id,payment_id,event,created_at) VALUES(?,?,?,?)").run(payment.companyId, payment.id, event, new Date().toISOString()); }
  events(company: string) { return this.db.prepare("SELECT payment_id,event,created_at FROM vault_payment_events WHERE company_id=? ORDER BY id DESC LIMIT 200").all(company); }
  close() { this.db.close(); }
}
