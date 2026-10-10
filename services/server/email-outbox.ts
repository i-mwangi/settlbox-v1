import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { WorkspaceEntityId } from "../../types/seeded-workspace";

export interface OutboxEvent {
  companyId: string;
  entityId: WorkspaceEntityId;
  key: string;
  recipient: string;
  subject: string;
  body: string;
}
export function createEmailOutboxSchema(database: DatabaseSync) {
  database.exec("CREATE TABLE IF NOT EXISTS email_outbox(id INTEGER PRIMARY KEY,company_id TEXT NOT NULL,entity_id TEXT NOT NULL,event_key TEXT NOT NULL,recipient TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'QUEUED',created_at TEXT NOT NULL,UNIQUE(company_id,entity_id,event_key)); CREATE INDEX IF NOT EXISTS email_outbox_pending ON email_outbox(company_id,entity_id,status,id)");
}
export function queueEmail(database: DatabaseSync, event: OutboxEvent): boolean {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.recipient)) return false;
  if (!event.key || !event.subject || event.subject.length > 500 || event.body.length > 20000 || /[\r\n]/.test(event.subject)) throw new Error("Invalid email event");
  return database.prepare("INSERT OR IGNORE INTO email_outbox(company_id,entity_id,event_key,recipient,subject,body,created_at) VALUES(?,?,?,?,?,?,?)").run(event.companyId, event.entityId, event.key, event.recipient, event.subject, event.body, new Date().toISOString()).changes > 0;
}
export class EmailOutboxRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000");
    createEmailOutboxSchema(this.database);
  }
  list(companyId: string, entityId: WorkspaceEntityId) {
    return this.database.prepare("SELECT id,event_key AS eventKey,recipient,subject,body,status,created_at AS createdAt FROM email_outbox WHERE company_id=? AND entity_id=? ORDER BY id DESC LIMIT 100").all(companyId, entityId);
  }
  close() { this.database.close(); }
}
export function openEmailOutbox() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new EmailOutboxRepository(path);
}
