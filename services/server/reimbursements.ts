import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseAmount } from "../arc/amount.ts";
import type { Reimbursement } from "../../types/reimbursement";

export function validateReimbursement(value: unknown): Reimbursement {
  if (!value || typeof value !== "object") throw new Error("A reimbursement is required");
  const input = value as Record<string, unknown>;
  if (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("A request ID is required");
  for (const field of ["employeeName", "description", "category", "recipient", "date", "amountExact"]) {
    if (typeof input[field] !== "string" || !String(input[field]).trim() || String(input[field]).length > 2000) throw new Error(`Invalid ${field}`);
  }
  if (!/^0x[0-9a-f]{40}$/i.test(String(input.recipient)) || /^0x0{40}$/i.test(String(input.recipient))) throw new Error("Select an employee with a valid Arc wallet");
  const amount = parseAmount(String(input.amountExact));
  if (amount <= 0n || amount % 1000000000000n !== 0n) throw new Error("Use a positive USDC amount with at most six decimal places");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date)) || !Number.isFinite(Date.parse(String(input.date))) || new Date(String(input.date)).toISOString().slice(0, 10) !== input.date) throw new Error("Invalid expense date");
  if (input.currency !== "USDC") throw new Error("Reimbursements settle in USDC");
  if (input.receiptUrl !== null && (typeof input.receiptUrl !== "string" || !/^\/api\/uploads\/[0-9a-f-]{36}\.(png|jpeg)$/.test(input.receiptUrl))) throw new Error("Upload a receipt image first");
  if (input.receiptName !== null && (typeof input.receiptName !== "string" || input.receiptName.length > 255)) throw new Error("Invalid receipt name");
  return { id: input.id, employeeName: String(input.employeeName).trim(), recipient: String(input.recipient), description: String(input.description).trim(), category: String(input.category).trim(), date: String(input.date), amountExact: String(input.amountExact), amount: Number(input.amountExact), currency: "USDC", receiptUrl: input.receiptUrl as string | null, receiptName: input.receiptName as string | null, status: "pending", historical: false, businessRecordId: null, transactionHash: null };
}

export class ReimbursementRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS reimbursements(company_id TEXT NOT NULL,entity_id TEXT NOT NULL,id TEXT NOT NULL,record TEXT NOT NULL,PRIMARY KEY(company_id,entity_id,id));");
  }
  close() { this.database.close(); }
  list(company: string, entity: string): Reimbursement[] {
    return this.database.prepare("SELECT record FROM reimbursements WHERE company_id=? AND entity_id=? ORDER BY rowid DESC").all(company, entity).map(row => JSON.parse(String(row.record)) as Reimbursement);
  }
  get(company: string, entity: string, id: string): Reimbursement | undefined {
    const row = this.database.prepare("SELECT record FROM reimbursements WHERE company_id=? AND entity_id=? AND id=?").get(company, entity, id);
    return row ? JSON.parse(String(row.record)) as Reimbursement : undefined;
  }
  seed(company: string, entity: string, rows: Reimbursement[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      for (const row of rows) this.database.prepare("INSERT OR IGNORE INTO reimbursements VALUES(?,?,?,?)").run(company, entity, row.id, JSON.stringify({ ...row, historical: true }));
      this.database.exec("COMMIT");
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  create(company: string, entity: string, value: unknown): Reimbursement {
    const record = validateReimbursement(value);
    this.database.prepare("INSERT OR IGNORE INTO reimbursements VALUES(?,?,?,?)").run(company, entity, record.id, JSON.stringify(record));
    const saved = this.get(company, entity, record.id)!;
    const existing = validateReimbursement(saved);
    if (JSON.stringify(existing) !== JSON.stringify(record)) throw new Error("Request ID belongs to another reimbursement");
    return saved;
  }
  update(company: string, entity: string, id: string, previous: Reimbursement, record: Reimbursement) {
    const result = this.database.prepare("UPDATE reimbursements SET record=? WHERE company_id=? AND entity_id=? AND id=? AND record=?").run(JSON.stringify(record), company, entity, id, JSON.stringify(previous));
    if (result.changes !== 1) throw new Error("Reimbursement changed; refresh before retrying");
    return record;
  }
}

export function openReimbursements() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new ReimbursementRepository(path);
}
