import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

export interface BalanceObservation { observedAt: string; amount: string }
export function recordBalanceObservation(company: string, entity: string, address: string, amount: string): BalanceObservation[] {
  const database = new DatabaseSync(resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite"));
  try {
    database.exec("PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS balance_observations(company_id TEXT NOT NULL,entity_id TEXT NOT NULL,address TEXT NOT NULL,hour TEXT NOT NULL,observed_at TEXT NOT NULL,amount TEXT NOT NULL,PRIMARY KEY(company_id,entity_id,address,hour));");
    const now = new Date().toISOString();
    database.prepare("INSERT INTO balance_observations VALUES(?,?,?,?,?,?) ON CONFLICT(company_id,entity_id,address,hour) DO UPDATE SET observed_at=excluded.observed_at,amount=excluded.amount").run(company, entity, address, now.slice(0, 16), now, amount);
    const cutoff=new Date(Date.now()-86400000).toISOString();
    return database.prepare("SELECT observed_at,amount FROM balance_observations WHERE company_id=? AND entity_id=? AND address=? AND observed_at IN (SELECT MAX(observed_at) FROM balance_observations WHERE company_id=? AND entity_id=? AND address=? GROUP BY CASE WHEN observed_at>=? THEN hour ELSE substr(hour,1,13) END) ORDER BY observed_at").all(company,entity,address,company,entity,address,cutoff).map(row => ({ observedAt: String(row.observed_at), amount: String(row.amount) }));
  } finally { database.close(); }
}
