import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface WorkspaceNotification {
  id: number;
  title: string;
  message: string;
  actionUrl: string;
  createdAt: string;
  readAt: string | null;
}
export interface NotificationPreferences { enabled: boolean; emails: string[]; revision: number }
export function validateNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Notification preferences are required");
  const input = value as Record<string,unknown>;
  if (Object.keys(input).some(key=>!["enabled","emails","revision"].includes(key)) || typeof input.enabled !== "boolean" || !Array.isArray(input.emails) || input.emails.length > 25 || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0) throw new Error("Invalid notification preferences");
  const emails=input.emails.map(value=>{
    if (typeof value !== "string") throw new Error("Invalid notification email");
    const email=value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid notification email");
    return email;
  });
  if (new Set(emails).size !== emails.length) throw new Error("Notification emails must be unique");
  return {enabled:input.enabled,emails,revision:Number(input.revision)};
}

export class NotificationRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS workspace_notifications(id INTEGER PRIMARY KEY,company_id TEXT NOT NULL,event_key TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,action_url TEXT NOT NULL,created_at TEXT NOT NULL,read_at TEXT,UNIQUE(company_id,event_key));
      CREATE INDEX IF NOT EXISTS notification_history ON workspace_notifications(company_id,id DESC);`);
    if (!this.database.prepare("PRAGMA table_info(workspace_notifications)").all().some(column => column.name === "hidden_at")) this.database.exec("ALTER TABLE workspace_notifications ADD COLUMN hidden_at TEXT");
    this.database.exec("CREATE TABLE IF NOT EXISTS notification_preferences(company_id TEXT PRIMARY KEY,record TEXT NOT NULL)");
  }
  preferences(companyId:string):NotificationPreferences {
    const row=this.database.prepare("SELECT record FROM notification_preferences WHERE company_id=?").get(companyId);
    return row?JSON.parse(String(row.record)):{enabled:false,emails:[],revision:0};
  }
  savePreferences(companyId:string,value:unknown):NotificationPreferences {
    const input=validateNotificationPreferences(value);
    this.database.exec("BEGIN IMMEDIATE");
    try {
      if (this.preferences(companyId).revision!==input.revision) throw new Error("Preferences changed elsewhere. Refresh before saving again");
      const next={...input,revision:input.revision+1};
      this.database.prepare("INSERT INTO notification_preferences VALUES(?,?) ON CONFLICT(company_id) DO UPDATE SET record=excluded.record").run(companyId,JSON.stringify(next));
      this.database.exec("COMMIT");return next;
    } catch(error){this.database.exec("ROLLBACK");throw error;}
  }
  publish(companyId: string, events: { key: string; title: string; message: string; actionUrl: string }[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const statement = this.database.prepare("INSERT OR IGNORE INTO workspace_notifications(company_id,event_key,title,message,action_url,created_at) VALUES(?,?,?,?,?,?)");
      for (const event of events) statement.run(companyId, event.key, event.title, event.message, event.actionUrl, new Date().toISOString());
      this.database.exec("COMMIT");
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  list(companyId: string): WorkspaceNotification[] {
    return this.database.prepare("SELECT * FROM workspace_notifications WHERE company_id=? AND hidden_at IS NULL ORDER BY id DESC LIMIT 100").all(companyId).map(row => ({ id: Number(row.id), title: String(row.title), message: String(row.message), actionUrl: String(row.action_url), createdAt: String(row.created_at), readAt: row.read_at === null ? null : String(row.read_at) }));
  }
  markRead(companyId: string, id?: number) {
    return Number((id === undefined ? this.database.prepare("UPDATE workspace_notifications SET read_at=? WHERE company_id=? AND read_at IS NULL").run(new Date().toISOString(), companyId) : this.database.prepare("UPDATE workspace_notifications SET read_at=? WHERE company_id=? AND id=? AND read_at IS NULL").run(new Date().toISOString(), companyId, id)).changes);
  }
  markUnread(companyId: string, id: number) {
    return Number(this.database.prepare("UPDATE workspace_notifications SET read_at=NULL WHERE company_id=? AND id=?").run(companyId, id).changes);
  }
  delete(companyId: string, id: number) {
    return Number(this.database.prepare("UPDATE workspace_notifications SET hidden_at=? WHERE company_id=? AND id=?").run(new Date().toISOString(), companyId, id).changes);
  }
  close() { this.database.close(); }
}

export function openNotifications() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new NotificationRepository(path);
}
