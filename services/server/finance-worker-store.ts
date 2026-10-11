import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { parseAmount } from "../arc/amount.ts";

export interface FinanceAutomation { enabled: boolean; autoQueue: boolean; reserveUsdc: string; maxActions: number; revision: number }
export function validateFinanceAutomation(value: unknown): Omit<FinanceAutomation, "revision"> {
  if (!value || typeof value !== "object") throw new Error("Automation settings are required");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !["enabled", "autoQueue", "reserveUsdc", "maxActions"].includes(key)) || typeof input.enabled !== "boolean" || typeof input.autoQueue !== "boolean" || typeof input.reserveUsdc !== "string" || input.reserveUsdc.length > 40 || !Number.isInteger(input.maxActions) || Number(input.maxActions) < 1 || Number(input.maxActions) > 5) throw new Error("Invalid automation settings");
  parseAmount(input.reserveUsdc, 6);
  return { enabled: input.enabled, autoQueue: input.autoQueue, reserveUsdc: input.reserveUsdc, maxActions: Number(input.maxActions) };
}
export class FinanceWorkerStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS finance_automation(company_id TEXT PRIMARY KEY,record TEXT NOT NULL); CREATE TABLE IF NOT EXISTS finance_worker_leases(company_id TEXT PRIMARY KEY,token TEXT NOT NULL,expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS finance_worker_events(id INTEGER PRIMARY KEY,company_id TEXT NOT NULL,cycle_id TEXT NOT NULL,event TEXT NOT NULL,created_at TEXT NOT NULL)");
  }
  config(company: string): FinanceAutomation { const row = this.db.prepare("SELECT record FROM finance_automation WHERE company_id=?").get(company); return row ? JSON.parse(String(row.record)) : { enabled: false, autoQueue: false, reserveUsdc: "0", maxActions: 3, revision: 0 }; }
  configure(company: string, value: unknown, actor: string) {
    const input = validateFinanceAutomation(value);
    this.db.exec("BEGIN IMMEDIATE");
    try { const next = { ...input, revision: this.config(company).revision + 1 }; this.db.prepare("INSERT INTO finance_automation VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET record=excluded.record").run(company, JSON.stringify(next)); this.event(company, "settings", `Automation settings changed by ${actor}: ${JSON.stringify(next)}`); this.db.exec("COMMIT"); return next; }
    catch(error) { this.db.exec("ROLLBACK"); throw error; }
  }
  acquire(company: string, now = Date.now()) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const config = this.config(company);
      const current = this.db.prepare("SELECT expires_at FROM finance_worker_leases WHERE company_id=?").get(company);
      if (!config.enabled || (current && Number(current.expires_at) > now)) { this.db.exec("COMMIT"); return null; }
      const token = randomUUID();
      this.db.prepare("INSERT INTO finance_worker_leases VALUES(?,?,?) ON CONFLICT(company_id) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at").run(company, token, now + 600000);
      this.event(company, token, "Cycle started"); this.db.exec("COMMIT"); return { token, config };
    } catch(error) { this.db.exec("ROLLBACK"); throw error; }
  }
  active(company: string, token: string, revision: number, now = Date.now()) {
    const config = this.config(company);
    const lease = this.db.prepare("SELECT token,expires_at FROM finance_worker_leases WHERE company_id=?").get(company);
    return config.enabled && config.revision === revision && lease?.token === token && Number(lease.expires_at) > now;
  }
  renew(company: string, token: string) { const now = Date.now(); this.db.prepare("UPDATE finance_worker_leases SET expires_at=? WHERE company_id=? AND token=? AND expires_at>?").run(now+600000,company,token,now); }
  release(company: string, token: string) { this.db.prepare("DELETE FROM finance_worker_leases WHERE company_id=? AND token=?").run(company,token); }
  event(company: string, token: string, event: string) { this.db.prepare("INSERT INTO finance_worker_events(company_id,cycle_id,event,created_at) VALUES(?,?,?,?)").run(company,token,event,new Date().toISOString()); }
  history(company: string) { return this.db.prepare("SELECT cycle_id,event,created_at FROM finance_worker_events WHERE company_id=? ORDER BY id DESC LIMIT 100").all(company); }
  close() { this.db.close(); }
}
