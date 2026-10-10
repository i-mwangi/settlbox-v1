import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const apply = process.argv.includes("--apply");
const cutoff = "2026-10-01";
function refresh(value, protectedIds = new Set()) {
  if (typeof value === "string") {
    if (/^20\d{2}-\d{2}-\d{2}(T.*)?$/.test(value) && value.slice(0, 10) < cutoff) return cutoff + value.slice(10);
    if (/^20\d{2}-\d{2}$/.test(value) && value < "2026-10") return "2026-10";
    return value.replace(/Q[1-3] 2026/g, "Q4 2026");
  }
  if (Array.isArray(value)) {
    const updated = value.map(item => refresh(item, protectedIds));
    if (updated.length && updated.every(item => item && typeof item === "object" && "month" in item && "netFlow" in item)) {
      const months = new Map();
      for (const item of updated) {
        const previous = months.get(item.month);
        if (!previous) months.set(item.month, item);
        else for (const key of ["income", "expenses", "payroll", "netFlow"]) previous[key] += item[key];
      }
      return [...months.values()];
    }
    return updated;
  }
  if (value && typeof value === "object") {
    if (value.businessRecordId || protectedIds.has(value.id)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, refresh(item, protectedIds)]));
  }
  return value;
}

for (const name of ["demo-data.json", "demo-data-entity-2.json", "demo-data-entity-3.json"]) {
  const path = resolve("public", name);
  const original = JSON.parse(readFileSync(path, "utf8"));
  const updated = refresh(original);
  if (apply) writeFileSync(path, JSON.stringify(updated, null, 2) + "\n");
  console.log(`${name}: ${JSON.stringify(original) === JSON.stringify(updated) ? "unchanged" : apply ? "updated" : "pending"}`);
}

const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
const database = new DatabaseSync(path);
database.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE");
try {
  const rows = database.prepare("SELECT company_id,entity_id,field,value FROM seeded_workspace_fields").all();
  const backupPath = resolve(dirname(path), `sample-dates-backup-${Date.now()}.json`);
  if (apply) { mkdirSync(dirname(backupPath), { recursive: true }); writeFileSync(backupPath, JSON.stringify(rows)); }
  const update = database.prepare("UPDATE seeded_workspace_fields SET value=? WHERE company_id=? AND entity_id=? AND field=?");
  const changedEntities = new Map();
  let changedFields = 0;
  for (const row of rows) {
    const verified = rows.find(candidate => candidate.company_id === row.company_id && candidate.entity_id === row.entity_id && candidate.field === "verifiedTransactionIds");
    const updated = JSON.stringify(refresh(JSON.parse(row.value), new Set(verified ? JSON.parse(verified.value) : [])));
    if (updated === row.value) continue;
    changedFields++;
    changedEntities.set(JSON.stringify([row.company_id, row.entity_id]), [row.company_id, row.entity_id]);
    if (apply) update.run(updated, row.company_id, row.entity_id, row.field);
  }
  if (apply) for (const [company, entity] of changedEntities.values()) database.prepare("UPDATE seeded_workspaces SET revision=revision+1 WHERE company_id=? AND entity_id=?").run(company, entity);
  database.exec(apply ? "COMMIT" : "ROLLBACK");
  console.log(`${changedFields} saved fields ${apply ? "updated" : "pending"}; ${changedEntities.size} workspaces`);
} catch (error) {
  database.exec("ROLLBACK");
  throw error;
} finally { database.close(); }
