import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DemoData } from "../../presentation/contexts/DemoProvider";
import type { SeededWorkspace, WorkspaceChange, WorkspaceEntityId } from "../../types/seeded-workspace";
import { validateWorkspaceRecord } from "./workspace-records.ts";
import type { WorkspaceResource } from "../../types/workspace";
import { createEmailOutboxSchema, queueEmail } from "./email-outbox.ts";
import { validateInvoicePresentation } from "../../types/invoice-presentation.ts";

const financialFields = new Set<keyof DemoData>(["card", "cards", "balances", "totalBalance", "transactions", "pendingProposals", "payrollStats", "invoiceStats", "billStats", "cardTransactions", "cardPoolBalance", "rampHistory", "monthlyFinancials"]);
const fields = new Set<keyof DemoData>(["company", "user", "teamMembers", "teamStats", "accounts", "balances", "totalBalance", "contacts", "contactCategories", "employees", "employeeGroups", "clients", "transactions", "pendingProposals", "payrolls", "payrollStats", "invoices", "invoiceStats", "bills", "billStats", "paymentLinks", "cardTransactions", "card", "cards", "cardPoolBalance", "invoiceSettings", "rampHistory", "monthlyFinancials"]);

export class SeededWorkspaceRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS seeded_workspaces(company_id TEXT NOT NULL,entity_id TEXT NOT NULL,revision INTEGER NOT NULL,imported_at TEXT NOT NULL,PRIMARY KEY(company_id,entity_id)); CREATE TABLE IF NOT EXISTS seeded_workspace_fields(company_id TEXT NOT NULL,entity_id TEXT NOT NULL,field TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(company_id,entity_id,field)); CREATE TABLE IF NOT EXISTS seeded_workspace_sources(company_id TEXT NOT NULL,entity_id TEXT NOT NULL,field TEXT NOT NULL,record_id TEXT NOT NULL,PRIMARY KEY(company_id,entity_id,field,record_id));");
    createEmailOutboxSchema(this.database);
  }
  seed(companyId: string, entityId: WorkspaceEntityId, data: DemoData): boolean {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.database.prepare("SELECT revision FROM seeded_workspaces WHERE company_id=? AND entity_id=?").get(companyId, entityId);
      if (existing) { this.database.exec("COMMIT"); return false; }
      this.database.prepare("INSERT INTO seeded_workspaces VALUES(?,?,0,?)").run(companyId, entityId, new Date().toISOString());
      for (const [field, value] of Object.entries(data)) {
        if (!fields.has(field as keyof DemoData)) continue;
        this.database.prepare("INSERT INTO seeded_workspace_fields VALUES(?,?,?,?)").run(companyId, entityId, field, JSON.stringify(value));
        if (Array.isArray(value)) for (const record of value) {
          if (record && typeof record === "object") this.database.prepare("INSERT OR IGNORE INTO seeded_workspace_sources VALUES(?,?,?,?)").run(companyId, entityId, field, String(record.uuid ?? record.id ?? record.code ?? ""));
        }
      }
      this.database.exec("COMMIT");
      return true;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  get(companyId: string, entityId: WorkspaceEntityId): SeededWorkspace {
    const entry = this.database.prepare("SELECT revision,imported_at FROM seeded_workspaces WHERE company_id=? AND entity_id=?").get(companyId, entityId);
    if (!entry) throw new Error("Workspace has not been seeded");
    const rows = this.database.prepare("SELECT field,value FROM seeded_workspace_fields WHERE company_id=? AND entity_id=?").all(companyId, entityId);
    return { entityId, revision: Number(entry.revision), importedAt: String(entry.imported_at), treasuryAddress: null, data: Object.fromEntries(rows.map(row => [String(row.field), JSON.parse(String(row.value))])) as DemoData };
  }
  update(companyId: string, entityId: WorkspaceEntityId, revision: number, changes: WorkspaceChange[], trusted = false): SeededWorkspace {
    if (!Number.isSafeInteger(revision) || !Array.isArray(changes) || changes.length > fields.size) throw new Error("Invalid workspace revision or changes");
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const current = this.get(companyId, entityId);
      if (current.revision !== revision) throw new Error("Workspace changed in another session. Refresh before retrying");
      const seen = new Set<string>();
      for (const change of changes) {
        if (!fields.has(change.field) || seen.has(change.field) || (!trusted && financialFields.has(change.field))) throw new Error("Financial results can only be updated from verified provider records");
        seen.add(change.field);
        const encoded = JSON.stringify(change.value);
        if (!encoded || encoded.length > 2000000) throw new Error("Workspace change is too large");
        if (Array.isArray(change.value) && change.value.length > 1000) throw new Error("A workspace collection supports up to 1000 records");
        if (!trusted && change.field === "invoiceSettings") {
          validateInvoicePresentation(change.value);
          const settings = change.value as Record<string, unknown>;
          if (typeof settings.invoicePrefix !== "string" || !settings.invoicePrefix.trim() || settings.invoicePrefix.length > 32 || !Number.isSafeInteger(settings.nextInvoiceNumber) || Number(settings.nextInvoiceNumber) < 1 || typeof settings.showWalletQr !== "boolean") throw new Error("Invalid invoice numbering or wallet display settings");
          if (typeof settings.defaultNote !== "string" || settings.defaultNote.length > 4000 || typeof settings.defaultPaymentTerms !== "string" || settings.defaultPaymentTerms.length > 100) throw new Error("Invalid invoice defaults");
          if (settings.logo !== null && (typeof settings.logo !== "string" || settings.logo.length > 700000 || !/^(\/[^/]|https:\/\/|data:image\/(png|jpeg);base64,)/.test(settings.logo))) throw new Error("Invalid invoice logo");
        }
        if (!trusted && ["employees", "employeeGroups", "clients", "contacts", "contactCategories", "company"].includes(change.field)) {
          const resources: Partial<Record<keyof DemoData, WorkspaceResource>> = { employees: "employees", employeeGroups: "employee-groups", clients: "clients", contacts: "contacts", contactCategories: "categories", company: "company" };
          const resource = resources[change.field];
          if (!resource) throw new Error("Unsupported workspace resource");
          if (change.field === "company") {
            validateWorkspaceRecord(resource, change.value);
          } else {
            if (!Array.isArray(change.value)) throw new Error("A workspace collection is required");
            if (change.field === "employees" && this.database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='payroll_contracts'").get()) {
              const contracts = this.database.prepare("SELECT employee_id FROM payroll_contracts WHERE company_id=? AND entity_id=? AND status IN ('ACTIVE','PAUSED')").all(companyId, entityId);
              if (contracts.some(contract => !(change.value as unknown[]).some(entry => entry && typeof entry === "object" && "id" in entry && entry.id === contract.employee_id))) throw new Error("Cancel active payroll contracts before removing their employee");
            }
            const previous = current.data[change.field];
            const records = Array.isArray(previous) ? previous : [];
            const identities = new Set<string>();
            for (const entry of change.value) {
              if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Invalid workspace record");
              const record = entry as Record<string, unknown>;
              const identity = String(record.uuid ?? record.id ?? "");
              if (!identity || identities.has(identity)) throw new Error("Workspace record identities must be unique");
              identities.add(identity);
              const existing = records.find(item => String("uuid" in item ? item.uuid : "id" in item ? item.id : "") === identity);
              if (JSON.stringify(existing) === JSON.stringify(entry)) continue;
              validateWorkspaceRecord(resource, entry);
              if (change.field === "employees") {
                const groupIds = Array.isArray(record.groupIds) ? record.groupIds : record.groupId ? [record.groupId] : [];
                const groupChange = changes.find(change => change.field === "employeeGroups");
                const groups = groupChange && Array.isArray(groupChange.value) ? groupChange.value : current.data.employeeGroups;
                if (groupIds.some(id => !groups.some(group => group && typeof group === "object" && "id" in group && group.id === id))) throw new Error("Employee group does not belong to this workspace");
              }
            }
          }
        }
        if (!trusted && ["invoices", "bills", "payrolls"].includes(change.field)) {
          if (!Array.isArray(change.value)) throw new Error("A record collection is required");
          const previous = current.data[change.field];
          const records = Array.isArray(previous) ? previous : [];
          for (const existing of records) {
            const protectedRecord = existing as unknown as Record<string, unknown>;
            if (protectedRecord.businessRecordId || protectedRecord.payrollContractId || ["PAID", "COMPLETED", "EXECUTED"].includes(String(protectedRecord.status).toUpperCase())) {
              const replacement = change.value.find(entry => entry && typeof entry === "object" && (entry as Record<string, unknown>).uuid === protectedRecord.uuid);
              let expected: Record<string, unknown> = protectedRecord;
              if (typeof protectedRecord.businessRecordId === "string") {
                const row = this.database.prepare("SELECT record FROM business_records WHERE company_id=? AND id=?").get(companyId, protectedRecord.businessRecordId);
                if (row) {
                  const canonical = JSON.parse(String(row.record)) as Record<string, unknown>;
                  const status = canonical.status === "paid" ? "PAID" : canonical.status === "issued" ? "SENT" : canonical.status === "draft" ? change.field === "bills" ? "PENDING" : protectedRecord.payrollContractId ? "CONFIRMED" : "DRAFT" : String(canonical.status).toUpperCase();
                  expected = { ...protectedRecord, status, paidAt: canonical.status === "paid" ? canonical.updatedAt : null };
                }
              }
              if (JSON.stringify(replacement) !== JSON.stringify(existing) && JSON.stringify(replacement) !== JSON.stringify(expected)) throw new Error("Settled and server-linked records can only be updated from verified provider records");
            }
          }
          for (const entry of change.value) {
            if (!entry || typeof entry !== "object") throw new Error("Invalid business record");
            const record = entry as Record<string, unknown>;
            const existing = records.find(item => "uuid" in item && item.uuid === record.uuid);
            const previousRecord = existing as unknown as Record<string, unknown> | undefined;
            for (const field of ["businessRecordId", "payrollContractId", "payrollPeriod", "amountExact", "transactionHash", "paidAt"]) {
              if (field === "paidAt" && previousRecord?.businessRecordId) continue;
              if (JSON.stringify(record[field] ?? null) !== JSON.stringify(previousRecord?.[field] ?? null)) throw new Error("Settlement fields can only be updated from verified provider records");
            }
            const status = String(record.status || "").toUpperCase();
            if (!previousRecord?.businessRecordId && ["PAID", "COMPLETED", "EXECUTED"].includes(status) && (!existing || !('status' in existing) || existing.status !== record.status)) throw new Error("Payment status requires a verified Arc transaction");
            if (record.txHash && (!existing || !('txHash' in existing) || existing.txHash !== record.txHash)) throw new Error("Transaction hashes cannot be supplied by the browser");
          }
        }
        this.database.prepare("INSERT INTO seeded_workspace_fields VALUES(?,?,?,?) ON CONFLICT(company_id,entity_id,field) DO UPDATE SET value=excluded.value").run(companyId, entityId, change.field, encoded);
        if (trusted && change.field === "invoices" && Array.isArray(change.value)) {
          for (const value of change.value) {
            if (!value || typeof value !== "object") continue;
            const invoice = value as Record<string, unknown>;
            const previous = current.data.invoices.find(previous => previous.uuid === invoice.uuid);
            if (invoice.type === "SENT" && invoice.status === "SENT" && previous?.status === "DRAFT" && typeof invoice.toEmail === "string") {
              queueEmail(this.database, { companyId, entityId, key: `invoice-issued:${String(invoice.uuid)}`, recipient: invoice.toEmail, subject: `Invoice ${String(invoice.invoiceNumber)} issued`, body: `${current.data.company.companyName} issued invoice ${String(invoice.invoiceNumber)} for ${String(invoice.amountExact ?? invoice.amount)} USDC due ${String(invoice.dueDate)}. Payment link: ${String(invoice.paymentLinkCode || "Available in Settlbox")}` });
            }
          }
        }
      }
      this.database.prepare("UPDATE seeded_workspaces SET revision=revision+1 WHERE company_id=? AND entity_id=?").run(companyId, entityId);
      this.database.exec("COMMIT");
      return this.get(companyId, entityId);
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  close() { this.database.close(); }
}

export function openSeededWorkspace() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new SeededWorkspaceRepository(path);
}
