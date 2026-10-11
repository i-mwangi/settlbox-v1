import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseAmount } from "../arc/amount.ts";
import type { BusinessRecord, BusinessRecordInput, BusinessRecordStatus } from "../../types/business";
import type { TransactionHash } from "../../types/finance";
import type { PaymentSchedule, ScheduleStatus } from "../../types/recurring-payment";
import { nextPaymentDate, scheduledRecordId, validateCalendarDate, validatePaymentSchedule } from "./payment-schedules.ts";

export function validateBusinessRecord(value: unknown): BusinessRecordInput {
  if (typeof value !== "object" || value === null) throw new Error("Business record is required");
  const input = value as Record<string, unknown>;
  if (input.kind !== "invoice" && input.kind !== "bill" && input.kind !== "payroll" && input.kind !== "reimbursement") throw new Error("Invalid business record type");
  for (const key of ["title", "counterparty", "description", "dueDate", "amount", "recipient"]) if (typeof input[key] !== "string") throw new Error(`${key} is required`);
  if (!String(input.title).trim() || String(input.title).length > 160 || !String(input.counterparty).trim() || String(input.counterparty).length > 160 || String(input.description).length > 4000) throw new Error("Invalid title, counterparty, or description");
  if (!/^0x[0-9a-fA-F]{40}$/.test(String(input.recipient)) || /^0x0{40}$/i.test(String(input.recipient))) throw new Error("A valid Arc wallet address is required");
  const amount = parseAmount(String(input.amount));
  if (amount <= 0n) throw new Error("Amount must be positive");
  if (input.kind !== "invoice" && amount % 1000000000000n !== 0n) throw new Error("Company USDC payments support up to six decimal places");
  const dueDate = String(input.dueDate);
  const timestamp = Date.parse(dueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== dueDate) throw new Error("A valid due date is required");
  if (input.receiptUrls !== undefined && (!Array.isArray(input.receiptUrls) || input.receiptUrls.length > 5 || input.receiptUrls.some(url => typeof url !== "string" || !/^\/api\/uploads\/[0-9a-f-]{36}\.(png|jpeg)$/.test(url)))) throw new Error("Up to five uploaded receipt images are supported");
  return { kind: input.kind, title: String(input.title).trim(), counterparty: String(input.counterparty).trim(), description: String(input.description), dueDate: String(input.dueDate), amount: String(input.amount), recipient: input.recipient as BusinessRecordInput["recipient"], ...(input.receiptUrls === undefined ? {} : { receiptUrls: input.receiptUrls as string[] }) };
}

export class BusinessRecordRepository {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS business_records(id TEXT PRIMARY KEY, company_id TEXT NOT NULL, kind TEXT NOT NULL, record TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS business_batches(company_id TEXT NOT NULL,request_id TEXT NOT NULL,payload TEXT NOT NULL,record_ids TEXT NOT NULL,PRIMARY KEY(company_id,request_id));
      CREATE TABLE IF NOT EXISTS payment_schedules(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,status TEXT NOT NULL,next_date TEXT NOT NULL,record TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS due_payment_schedules ON payment_schedules(company_id,status,next_date);
      CREATE INDEX IF NOT EXISTS business_record_listing ON business_records(company_id,kind);`);
    this.database.exec("CREATE TABLE IF NOT EXISTS business_payment_routes(company_id TEXT NOT NULL,record_id TEXT NOT NULL,route TEXT NOT NULL,PRIMARY KEY(company_id,record_id))");
  }

  create(companyId: string, input: unknown, requestId?: string): BusinessRecord {
    const details = validateBusinessRecord(input);
    if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) throw new Error("A valid request ID is required");
    const now = new Date().toISOString();
    const record: BusinessRecord = { ...details, id: requestId || randomUUID(), companyId, status: "draft", paymentLinkCode: null, transactionHash: null, createdAt: now, updatedAt: now };
    this.database.prepare("INSERT OR IGNORE INTO business_records(id,company_id,kind,record) VALUES(?,?,?,?)").run(record.id, companyId, record.kind, JSON.stringify(record));
    const saved = this.get(companyId, record.id);
    if (!saved || JSON.stringify(validateBusinessRecord(saved)) !== JSON.stringify(details)) throw new Error("Request ID already belongs to a different record; refresh before retrying");
    return saved;
  }

  get(companyId: string, id: string): BusinessRecord | undefined {
    const row = this.database.prepare("SELECT record FROM business_records WHERE id=? AND company_id=?").get(id, companyId);
    return row && typeof row.record === "string" ? JSON.parse(row.record) as BusinessRecord : undefined;
  }
  claimPaymentRoute(companyId: string, id: string, route: "treasury" | "vault") {
    this.database.prepare("INSERT OR IGNORE INTO business_payment_routes VALUES(?,?,?)").run(companyId, id, route);
    const saved = this.database.prepare("SELECT route FROM business_payment_routes WHERE company_id=? AND record_id=?").get(companyId, id);
    if (saved?.route !== route) throw new Error("This obligation is assigned to a different payment workflow");
  }

  createBatch(companyId: string, requestId: string, values: unknown): BusinessRecord[] {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId) || !Array.isArray(values) || !values.length || values.length > 100) throw new Error("A batch ID and between 1 and 100 payments are required");
    const details = values.map(validateBusinessRecord);
    if (details.some(record => record.kind !== "bill")) throw new Error("Batch payments must be bills");
    const payload = JSON.stringify(details);
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.database.prepare("SELECT payload,record_ids FROM business_batches WHERE company_id=? AND request_id=?").get(companyId, requestId);
      if (existing) {
        if (existing.payload !== payload) throw new Error("Batch ID already belongs to a different request");
        const ids = JSON.parse(String(existing.record_ids)) as string[];
        const records = ids.map(id => {
          const record = this.get(companyId, id);
          if (!record) throw new Error("Saved batch is incomplete");
          return record;
        });
        this.database.exec("COMMIT");
        return records;
      }
      const records = details.map(input => this.create(companyId, input));
      this.database.prepare("INSERT INTO business_batches(company_id,request_id,payload,record_ids) VALUES(?,?,?,?)").run(companyId, requestId, payload, JSON.stringify(records.map(record => record.id)));
      this.database.exec("COMMIT");
      return records;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }

  list(companyId: string): BusinessRecord[] {
    return this.database.prepare("SELECT record FROM business_records WHERE company_id=? ORDER BY json_extract(record,'$.createdAt') DESC LIMIT 500").all(companyId).map(row => JSON.parse(String(row.record)) as BusinessRecord);
  }

  listSchedules(companyId: string): PaymentSchedule[] {
    return this.database.prepare("SELECT record FROM payment_schedules WHERE company_id=? ORDER BY rowid DESC LIMIT 500").all(companyId).map(row => JSON.parse(String(row.record)) as PaymentSchedule);
  }

  getSchedule(companyId: string, id: string): PaymentSchedule | undefined {
    const row = this.database.prepare("SELECT record FROM payment_schedules WHERE company_id=? AND id=?").get(companyId, id);
    return row ? JSON.parse(String(row.record)) as PaymentSchedule : undefined;
  }

  createSchedule(companyId: string, id: string, value: unknown): PaymentSchedule {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("A schedule request ID is required");
    const input = validatePaymentSchedule(value, validateBusinessRecord);
    const now = new Date().toISOString();
    const record: PaymentSchedule = { ...input, id, companyId, nextDueDate: input.payment.dueDate, status: "active", createdAt: now, updatedAt: now };
    this.database.prepare("INSERT OR IGNORE INTO payment_schedules(id,company_id,status,next_date,record) VALUES(?,?,?,?,?)").run(id, companyId, record.status, record.nextDueDate, JSON.stringify(record));
    const saved = this.getSchedule(companyId, id);
    if (!saved || JSON.stringify(validatePaymentSchedule(saved, validateBusinessRecord)) !== JSON.stringify(input)) throw new Error("Schedule ID already belongs to a different request");
    return saved;
  }

  setScheduleStatus(companyId: string, id: string, status: ScheduleStatus): PaymentSchedule {
    if (status !== "active" && status !== "paused" && status !== "cancelled") throw new Error("Invalid schedule action");
    const record = this.getSchedule(companyId, id);
    if (!record || record.status === "cancelled" || record.status === "completed") throw new Error("Only active or paused schedules can be changed");
    const next = { ...record, status, updatedAt: new Date().toISOString() };
    const result = this.database.prepare("UPDATE payment_schedules SET status=?,record=? WHERE id=? AND company_id=? AND record=?").run(status, JSON.stringify(next), id, companyId, JSON.stringify(record));
    if (Number(result.changes) !== 1) throw new Error("Schedule changed; refresh before retrying");
    return next;
  }

  prepareDuePayments(companyId: string, today = new Date().toISOString().slice(0, 10)): BusinessRecord[] {
    validateCalendarDate(today);
    const prepared: BusinessRecord[] = [];
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const rows = this.database.prepare("SELECT record FROM payment_schedules WHERE company_id=? AND status='active' AND next_date<=? ORDER BY next_date,id LIMIT 100").all(companyId, today);
      for (const row of rows) {
        let schedule = JSON.parse(String(row.record)) as PaymentSchedule;
        while (schedule.status === "active" && schedule.nextDueDate <= today && prepared.length < 100) {
          const draft = this.create(companyId, { ...schedule.payment, dueDate: schedule.nextDueDate }, scheduledRecordId(schedule.id, schedule.nextDueDate));
          this.database.prepare("UPDATE business_records SET record=json_set(record,'$.scheduleId',?) WHERE id=? AND company_id=?").run(schedule.id, draft.id, companyId);
          prepared.push({ ...draft, scheduleId: schedule.id });
          const nextDate = schedule.frequency === "once" ? schedule.nextDueDate : nextPaymentDate(schedule.nextDueDate, schedule.frequency, schedule.payment.dueDate);
          schedule = { ...schedule, nextDueDate: nextDate, status: schedule.frequency === "once" || (schedule.endDate !== null && nextDate > schedule.endDate) ? "completed" : "active", updatedAt: new Date().toISOString() };
        }
        this.database.prepare("UPDATE payment_schedules SET status=?,next_date=?,record=? WHERE id=? AND company_id=?").run(schedule.status, schedule.nextDueDate, JSON.stringify(schedule), schedule.id, companyId);
        if (prepared.length === 100) break;
      }
      this.database.exec("COMMIT");
      return prepared;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }

  updateDraft(companyId: string, id: string, input: unknown): BusinessRecord {
    const details = validateBusinessRecord(input);
    const record = this.get(companyId, id);
    if (!record || record.status !== "draft" || record.kind !== details.kind) throw new Error("Only draft records can be edited");
    const next = { ...record, ...details, updatedAt: new Date().toISOString() };
    const result = this.database.prepare("UPDATE business_records SET record=? WHERE id=? AND company_id=? AND record=?").run(JSON.stringify(next), id, companyId, JSON.stringify(record));
    if (Number(result.changes) !== 1) throw new Error("Record changed; refresh before editing");
    return next;
  }

  transition(companyId: string, id: string, status: BusinessRecordStatus, expected: readonly BusinessRecordStatus[], extras: { paymentLinkCode?: string; transactionHash?: TransactionHash } = {}): BusinessRecord {
    const record = this.get(companyId, id);
    if (!record) throw new Error("Business record not found");
    if (record.status === status) return record;
    if (!expected.includes(record.status)) throw new Error("Business record is not eligible for this action");
    const next = { ...record, ...extras, status, updatedAt: new Date().toISOString() };
    const result = this.database.prepare("UPDATE business_records SET record=? WHERE id=? AND company_id=? AND record=?").run(JSON.stringify(next), id, companyId, JSON.stringify(record));
    if (Number(result.changes) !== 1) throw new Error("Record changed; refresh before retrying");
    return next;
  }

  close() { this.database.close(); }

  cancel(companyId: string, id: string) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const record = this.get(companyId, id);
      if (!record || !["draft", "issued"].includes(record.status)) throw new Error("Only unpaid drafts or issued invoices can be cancelled");
      if (record.paymentLinkCode) {
        if (this.database.prepare("SELECT 1 FROM business_link_payments WHERE code=? LIMIT 1").get(record.paymentLinkCode)) throw new Error("A settled invoice cannot be cancelled");
        this.database.prepare("UPDATE business_payment_links SET record=json_set(record,'$.status','DEACTIVATED') WHERE code=?").run(record.paymentLinkCode);
      }
      const next = this.transition(companyId, id, "cancelled", ["draft", "issued"]);
      this.database.exec("COMMIT");
      return next;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
}

export function openBusinessRecords() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new BusinessRecordRepository(path);
}
