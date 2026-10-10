import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { GlobalAccountHistory, YieldHistory } from "../../types/provider-history";

export interface ProviderHistory { globalAccounts: GlobalAccountHistory; yield: YieldHistory }
export class ProviderHistoryRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS provider_history(company_id TEXT NOT NULL,entity_id TEXT NOT NULL,resource TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(company_id,entity_id,resource));");
  }
  close() { this.database.close(); }
  seed(company: string, entity: string, history: ProviderHistory) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const [resource, record] of Object.entries(history)) this.database.prepare("INSERT OR IGNORE INTO provider_history VALUES(?,?,?,?)").run(company, entity, resource, JSON.stringify(record));
      this.database.exec("COMMIT");
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  get(company: string, entity: string): ProviderHistory {
    const history: ProviderHistory = { globalAccounts: { accounts: [], deposits: [] }, yield: { apy: 0, monthly: [], activity: [] } };
    for (const row of this.database.prepare("SELECT resource,record FROM provider_history WHERE company_id=? AND entity_id=?").all(company, entity)) {
      if (row.resource === "globalAccounts") history.globalAccounts = JSON.parse(String(row.record)) as GlobalAccountHistory;
      if (row.resource === "yield") history.yield = JSON.parse(String(row.record)) as YieldHistory;
    }
    return history;
  }
}
export function openProviderHistory() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new ProviderHistoryRepository(path);
}
