import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseAmount } from "../arc/amount.ts";
import { validateBusinessRecord } from "./business-records.ts";
import { createEmailOutboxSchema, queueEmail } from "./email-outbox.ts";
import type { BusinessRecord } from "../../types/business";
import type { DemoData, DemoInvoice, DemoBill } from "../../presentation/contexts/DemoProvider";
import type { PayrollContract, PayrollContractInput } from "../../types/payroll-contract";
import type { WorkspaceEntityId } from "../../types/seeded-workspace";

function calendarDate(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("A valid joining date is required");
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("Invalid calendar date");
  return date;
}

export function payrollDate(start: string, months: number, payday: number): string {
  const base = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
  base.setUTCMonth(base.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(payday, lastDay));
  return base.toISOString().slice(0, 10);
}

export function validatePayrollContract(value: unknown): PayrollContractInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Payroll contract details are required");
  const input = value as Record<string, unknown>;
  if (input.network !== undefined) {
    const network = input.network;
    if (!network || typeof network !== "object" || (network as Record<string, unknown>).chainId !== 5042002) throw new Error("Payroll requires Arc Testnet");
  }
  if (input.token !== undefined) {
    const token = input.token;
    if (!token || typeof token !== "object" || (token as Record<string, unknown>).symbol !== "USDC") throw new Error("Payroll requires USDC");
  }
  const amount = typeof input.amount === "string" ? parseAmount(input.amount) : 0n;
  if (amount <= 0n || amount % 1000000000000n !== 0n) throw new Error("Payroll amount must be positive USDC with up to six decimals");
  if (!Number.isSafeInteger(input.employeeId) || Number(input.employeeId) < 1) throw new Error("Select an employee");
  if (!Number.isSafeInteger(input.payday) || Number(input.payday) < 1 || Number(input.payday) > 31) throw new Error("Invalid pay day");
  if (!Number.isSafeInteger(input.payrollCycle) || Number(input.payrollCycle) < 1 || Number(input.payrollCycle) > 120) throw new Error("Payroll duration must be between 1 and 120 months");
  if (input.contractTerm !== "PERMANENT" && input.contractTerm !== "CONTRACTOR") throw new Error("Invalid contract term");
  if (typeof input.description !== "string" || !input.description.trim() || input.description.length > 4000) throw new Error("Payroll description is required");
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 4000)) throw new Error("Invalid payroll note");
  const generateDaysBefore = input.generateDaysBefore ?? 5;
  if (!Number.isSafeInteger(generateDaysBefore) || Number(generateDaysBefore) < 0 || Number(generateDaysBefore) > 31) throw new Error("Invalid invoice preparation lead time");
  return { employeeId: Number(input.employeeId), amount: String(input.amount), payday: Number(input.payday), payrollCycle: Number(input.payrollCycle), joiningDate: calendarDate(input.joiningDate), contractTerm: input.contractTerm, description: input.description.trim(), note: String(input.note || ""), generateDaysBefore: Number(generateDaysBefore) };
}

export class PayrollContractRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS payroll_contracts(id INTEGER PRIMARY KEY AUTOINCREMENT,uuid TEXT UNIQUE NOT NULL,company_id TEXT NOT NULL,entity_id TEXT NOT NULL,employee_id INTEGER NOT NULL,status TEXT NOT NULL,record TEXT NOT NULL); CREATE UNIQUE INDEX IF NOT EXISTS payroll_active_employee ON payroll_contracts(company_id,entity_id,employee_id) WHERE status IN ('ACTIVE','PAUSED'); CREATE TABLE IF NOT EXISTS payroll_periods(contract_id INTEGER NOT NULL,period INTEGER NOT NULL,invoice_id TEXT UNIQUE NOT NULL,confirmed INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(contract_id,period)); CREATE TABLE IF NOT EXISTS business_records(id TEXT PRIMARY KEY,company_id TEXT NOT NULL,kind TEXT NOT NULL,record TEXT NOT NULL);");
    createEmailOutboxSchema(this.database);
  }
  private workspace(companyId: string, entity: WorkspaceEntityId): DemoData {
    const rows = this.database.prepare("SELECT field,value FROM seeded_workspace_fields WHERE company_id=? AND entity_id=?").all(companyId, entity);
    if (!rows.length) throw new Error("Workspace has not been seeded");
    return Object.fromEntries(rows.map(row => [String(row.field), JSON.parse(String(row.value))])) as DemoData;
  }
  list(companyId: string, entity: WorkspaceEntityId): PayrollContract[] {
    return this.database.prepare("SELECT record FROM payroll_contracts WHERE company_id=? AND entity_id=? ORDER BY id DESC LIMIT 1000").all(companyId, entity).map(row => JSON.parse(String(row.record)) as PayrollContract);
  }
  get(companyId: string, entity: WorkspaceEntityId, id: number): PayrollContract {
    const row = this.database.prepare("SELECT record FROM payroll_contracts WHERE company_id=? AND entity_id=? AND id=?").get(companyId, entity, id);
    if (!row) throw new Error("Payroll contract not found");
    return JSON.parse(String(row.record)) as PayrollContract;
  }
  save(companyId: string, entity: WorkspaceEntityId, value: unknown, id?: number): PayrollContract {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const previous = id === undefined ? undefined : this.get(companyId, entity, id);
      if (previous && previous.status !== "ACTIVE" && previous.status !== "PAUSED") throw new Error("This payroll contract is closed");
      if (previous && this.database.prepare("SELECT 1 FROM payroll_periods WHERE contract_id=? LIMIT 1").get(previous.id)) throw new Error("A prepared contract cannot be edited. Cancel it and create new terms");
      const input = validatePayrollContract(previous ? { ...previous, ...(value as Record<string, unknown>) } : value);
      const data = this.workspace(companyId, entity);
      const employee = data.employees.find(employee => employee.id === input.employeeId);
      if (!employee || employee.isActive === false) throw new Error("An active employee in this workspace is required");
      const duplicate = this.database.prepare("SELECT id FROM payroll_contracts WHERE company_id=? AND entity_id=? AND employee_id=? AND status IN ('ACTIVE','PAUSED') AND id<>?").get(companyId, entity, input.employeeId, id ?? -1);
      if (duplicate) throw new Error("This employee already has an active payroll contract");
      if (!/^0x[0-9a-f]{40}$/i.test(employee.walletAddress) || /^0x0{40}$/i.test(employee.walletAddress)) throw new Error("Update the employee with a valid Arc wallet address first");
      const today = new Date().toISOString().slice(0, 10);
      const base = input.joiningDate > today ? input.joiningDate : today;
      let start = payrollDate(base, 0, input.payday);
      if (start < base) start = payrollDate(base, 1, input.payday);
      const now = new Date().toISOString();
      const uuid = previous?.uuid || randomUUID();
      const recordId = previous?.id ?? Number(this.database.prepare("INSERT INTO payroll_contracts(uuid,company_id,entity_id,employee_id,status,record) VALUES(?,?,?,?,?,?)").run(uuid, companyId, entity, input.employeeId, "ACTIVE", "{}").lastInsertRowid);
      const record: PayrollContract = { ...input, id: recordId, uuid, companyId, entityId: entity, status: previous?.status || "ACTIVE", payStartDate: start, payEndDate: payrollDate(start, input.payrollCycle - 1, input.payday), createdAt: previous?.createdAt || now, updatedAt: now, employee: { id: employee.id, name: employee.name, email: employee.email, walletAddress: employee.walletAddress as PayrollContract["employee"]["walletAddress"], groupId: employee.groupId } };
      this.database.prepare("UPDATE payroll_contracts SET employee_id=?,status=?,record=? WHERE id=?").run(record.employeeId, record.status, JSON.stringify(record), recordId);
      this.database.exec("COMMIT");
      return record;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  setStatus(companyId: string, entity: WorkspaceEntityId, id: number, status: "ACTIVE" | "PAUSED" | "CANCELLED"): PayrollContract {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const record = this.get(companyId, entity, id);
      if (record.status === "CANCELLED" || record.status === "COMPLETED") throw new Error("This payroll contract is closed");
      const next = { ...record, status, updatedAt: new Date().toISOString() };
      this.database.prepare("UPDATE payroll_contracts SET status=?,record=? WHERE id=?").run(status, JSON.stringify(next), id);
      this.database.exec("COMMIT");
      return next;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  private writeFields(companyId: string, entity: WorkspaceEntityId, values: Partial<Pick<DemoData, "invoices" | "bills">>) {
    for (const [field, value] of Object.entries(values)) this.database.prepare("UPDATE seeded_workspace_fields SET value=? WHERE company_id=? AND entity_id=? AND field=?").run(JSON.stringify(value), companyId, entity, field);
    this.database.prepare("UPDATE seeded_workspaces SET revision=revision+1 WHERE company_id=? AND entity_id=?").run(companyId, entity);
  }
  prepare(companyId: string, entity: WorkspaceEntityId, id: number, period: number): DemoInvoice {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const contract = this.get(companyId, entity, id);
      const data = this.workspace(companyId, entity);
      if (!Number.isSafeInteger(period) || period < 0 || period >= contract.payrollCycle) throw new Error("Invalid payroll period");
      const previous = this.database.prepare("SELECT invoice_id FROM payroll_periods WHERE contract_id=? AND period=?").get(id, period);
      if (previous) {
        const invoice = data.invoices.find(invoice => invoice.uuid === previous.invoice_id);
        if (!invoice) throw new Error("Prepared payroll invoice is missing");
        queueEmail(this.database, { companyId, entityId: entity, key: `payroll-invoice:${invoice.uuid}`, recipient: contract.employee.email, subject: `Invoice ${invoice.invoiceNumber} prepared`, body: `${data.company.companyName} prepared a payroll invoice for ${contract.amount} USDC due ${invoice.dueDate}. The invoice requires workspace review before payment.` });
        this.database.exec("COMMIT");
        return invoice;
      }
      if (contract.status !== "ACTIVE") throw new Error("Only active contracts can prepare invoices");
      if (!data.employees.some(employee => employee.id === contract.employeeId && employee.isActive !== false)) throw new Error("Payroll employee must remain active");
      const now = new Date().toISOString();
      const invoice: DemoInvoice = { id: Date.now(), uuid: randomUUID(), invoiceNumber: `PAY-${id}-${period + 1}`, type: "RECEIVED", status: "SENT", amount: Number(contract.amount), amountExact: contract.amount, currency: "USDC", from: contract.employee.name, to: data.company.companyName, toEmail: contract.employee.email, description: contract.description, dueDate: payrollDate(contract.payStartDate, period, contract.payday), paidAt: null, createdAt: now, payrollContractId: id, payrollPeriod: period, recipient: contract.employee.walletAddress, items: [{ description: contract.description, quantity: 1, unitPrice: Number(contract.amount) }] };
      this.database.prepare("INSERT INTO payroll_periods(contract_id,period,invoice_id) VALUES(?,?,?)").run(id, period, invoice.uuid);
      this.writeFields(companyId, entity, { invoices: [invoice, ...data.invoices] });
      queueEmail(this.database, { companyId, entityId: entity, key: `payroll-invoice:${invoice.uuid}`, recipient: contract.employee.email, subject: `Invoice ${invoice.invoiceNumber} prepared`, body: `${data.company.companyName} prepared a payroll invoice for ${contract.amount} USDC due ${invoice.dueDate}. The invoice requires workspace review before payment.` });
      this.database.exec("COMMIT");
      return invoice;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  confirm(companyId: string, entity: WorkspaceEntityId, invoiceId: string): DemoBill {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const data = this.workspace(companyId, entity);
      const invoice = data.invoices.find(invoice => invoice.uuid === invoiceId);
      if (!invoice?.payrollContractId || !invoice.recipient || !invoice.amountExact) throw new Error("A payroll invoice is required");
      const contract = this.get(companyId, entity, invoice.payrollContractId);
      const existing = data.bills.find(bill => bill.invoiceUuid === invoiceId);
      if (existing) { this.database.exec("COMMIT"); return existing; }
      if (contract.status !== "ACTIVE" || invoice.status !== "SENT") throw new Error("Invoice cannot be confirmed");
      const digest = createHash("sha256").update(`${companyId}:${entity}:${invoiceId}`).digest("hex");
      const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
      const now = new Date().toISOString();
      const details = validateBusinessRecord({ kind: "payroll", title: invoice.invoiceNumber, counterparty: invoice.from, recipient: invoice.recipient, amount: invoice.amountExact, dueDate: invoice.dueDate, description: invoice.description });
      const business: BusinessRecord = { ...details, id, companyId, status: "draft", paymentLinkCode: null, transactionHash: null, createdAt: now, updatedAt: now };
      this.database.prepare("INSERT INTO business_records(id,company_id,kind,record) VALUES(?,?,?,?)").run(id, companyId, "payroll", JSON.stringify(business));
      const bill: DemoBill = { id: Date.now(), uuid: randomUUID(), vendor: invoice.from, description: invoice.description, amount: invoice.amount, amountExact: invoice.amountExact, currency: "USDC", status: "PENDING", dueDate: invoice.dueDate, paidAt: null, category: "payroll", recurring: true, frequency: "MONTHLY", createdAt: now, recipient: invoice.recipient, invoiceUuid: invoice.uuid, businessRecordId: id };
      this.writeFields(companyId, entity, { invoices: data.invoices.map(item => item.uuid === invoiceId ? { ...item, status: "CONFIRMED", businessRecordId: id } : item), bills: [bill, ...data.bills] });
      this.database.prepare("UPDATE payroll_periods SET confirmed=1 WHERE invoice_id=?").run(invoiceId);
      this.database.exec("COMMIT");
      return bill;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  prepareDue(companyId: string, entity: WorkspaceEntityId, today = new Date().toISOString().slice(0, 10)): DemoInvoice[] {
    calendarDate(today);
    const prepared: DemoInvoice[] = [];
    for (const contract of this.list(companyId, entity).filter(contract => contract.status === "ACTIVE")) {
      for (let period = 0; period < contract.payrollCycle; period++) {
        const due = new Date(`${payrollDate(contract.payStartDate, period, contract.payday)}T00:00:00Z`);
        due.setUTCDate(due.getUTCDate() - (contract.generateDaysBefore ?? 5));
        if (due.toISOString().slice(0, 10) > today) break;
        if (this.database.prepare("SELECT 1 FROM payroll_periods WHERE contract_id=? AND period=?").get(contract.id, period)) continue;
        prepared.push(this.prepare(companyId, entity, contract.id, period));
      }
    }
    return prepared;
  }
  close() { this.database.close(); }
}

export function openPayrollContracts() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new PayrollContractRepository(path);
}
