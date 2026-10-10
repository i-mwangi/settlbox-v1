import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { WorkspaceResource } from "../../types/workspace";
import { parseAmount } from "../arc/amount.ts";
import { validateInvoicePresentation } from "../../types/invoice-presentation.ts";

const resources: readonly WorkspaceResource[] = ["employees", "employee-groups", "clients", "categories", "contacts", "company", "payment-groups", "invoice-settings"];
export function workspaceResource(value: string): WorkspaceResource {
  if (!resources.includes(value as WorkspaceResource)) throw new Error("Unknown workspace resource");
  return value as WorkspaceResource;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A record is required");
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, required = false): string {
  if (value === undefined || value === null) { if (required) throw new Error(`${label} is required`); return ""; }
  if (typeof value !== "string" || value.length > 2000 || (required && !value.trim())) throw new Error(`Invalid ${label}`);
  return value.trim();
}

function fields(input: Record<string, unknown>, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map(name => [name, text(input[name], name)]));
}

export function validateWorkspaceRecord(resource: WorkspaceResource, value: unknown): Record<string, unknown> {
  const input = object(value);
  if (resource === "invoice-settings") return { ...validateInvoicePresentation(input) };
  if (resource === "company") {
    const profile = fields(input, ["companyName", "registrationNumber", "country", "industry", "companySize", "website", "address1", "address2", "city", "postalCode", "notificationEmail"]);
    if (!profile.companyName) throw new Error("Company name is required");
    return { ...profile, logo: input.logo ? text(input.logo, "logo") : null };
  }
  if (resource === "clients") {
    const client = fields(input, ["email", "companyName", "companyType", "country", "state", "city", "address1", "address2", "taxId", "postalCode", "registrationNumber"]);
    if (!client.companyName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) throw new Error("A company name and valid email are required");
    return client;
  }
  const name = text(input.name, "name", true);
  if (resource === "payment-groups") {
    if (!Array.isArray(input.members) || !input.members.length || input.members.length > 100) throw new Error("A group needs between 1 and 100 members");
    const members = input.members.map(value => {
      const member = object(value);
      const address = text(member.address, "member address", true);
      if (!/^0x[0-9a-f]{40}$/i.test(address) || /^0x0{40}$/i.test(address)) throw new Error("A valid Arc member address is required");
      return { name: text(member.name, "member name", true), address };
    });
    if (new Set(members.map(member => member.address.toLowerCase())).size !== members.length) throw new Error("Group member addresses must be unique");
    return { name, members, ownerAddress: "" };
  }
  if (resource === "categories" || resource === "employee-groups") {
    const shape = input.shape ?? "CIRCLE";
    const color = input.color ?? "#35ADE9";
    if (!["CIRCLE", "SQUARE", "DIAMOND", "TRIANGLE"].includes(String(shape))) throw new Error("Invalid category shape");
    if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Invalid category color");
    return { name, shape, color, order: Number.isSafeInteger(input.order) ? input.order : 0 };
  }
  const walletAddress = text(input.walletAddress ?? input.address, "wallet address", true);
  if (!/^0x[0-9a-f]{40}$/i.test(walletAddress) || /^0x0{40}$/i.test(walletAddress)) throw new Error("A valid Arc wallet address is required");
  const email = text(input.email, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
  if (input.paymentMethod && input.paymentMethod !== "crypto") throw new Error("Fiat payments are not configured");
  if (input.network !== undefined && input.network !== null && object(input.network).chainId !== 5042002) throw new Error("Arc Testnet is required");
  if (input.token !== undefined && input.token !== null && object(input.token).symbol !== "USDC") throw new Error("USDC settlement is required");
  const groupIds = Array.isArray(input.groupIds) ? input.groupIds : input.groupId ? [input.groupId] : [];
  if (groupIds.some(id => typeof id !== "number" || !Number.isSafeInteger(id) || id < 1)) throw new Error("Invalid contact group");
  let payroll = null;
  if (input.payroll) {
    const terms = object(input.payroll);
    const monthlyAmount = String(terms.monthlyAmount);
    const amount = parseAmount(monthlyAmount);
    if (amount <= 0n || amount % 1000000000000n !== 0n) throw new Error("Monthly USDC amount must be positive with up to six decimals");
    const paydayDay = Number(terms.paydayDay);
    const duration = Number(terms.duration);
    if (!Number.isSafeInteger(paydayDay) || paydayDay < 1 || paydayDay > 28 || !Number.isSafeInteger(duration) || duration < 1 || duration > 120) throw new Error("Invalid payroll duration or pay day");
    if (terms.durationUnit !== "month" && terms.durationUnit !== "year") throw new Error("Invalid payroll duration unit");
    payroll = { monthlyAmount, paydayDay, duration, durationUnit: terms.durationUnit, description: text(terms.description, "description"), note: text(terms.note, "note") };
  }
  return { name, email, walletAddress, address: walletAddress, description: text(input.description, "description"), groupIds: [...new Set(groupIds)], groupId: groupIds[0] || 0, category: text(input.category, "category"), categoryId: Number.isSafeInteger(input.categoryId) ? input.categoryId : 0, employeeType: input.employeeType === "contractor" ? "contractor" : "employee", isActive: input.isActive !== false, paymentMethod: "crypto", payroll, order: Number.isSafeInteger(input.order) ? input.order : 0, token: { address: "native-usdc", name: "USD Coin", symbol: "USDC", decimals: 18 }, network: { name: "Arc Testnet", chainId: 5042002 } };
}

export class WorkspaceRepository {
  private readonly database: DatabaseSync;
  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS workspace_records(id INTEGER PRIMARY KEY AUTOINCREMENT, company_id TEXT NOT NULL, resource TEXT NOT NULL, uuid TEXT UNIQUE NOT NULL, record TEXT NOT NULL); CREATE INDEX IF NOT EXISTS workspace_record_listing ON workspace_records(company_id,resource,id);");
  }
  list(companyId: string, resource: WorkspaceResource): Record<string, unknown>[] {
    return this.database.prepare("SELECT record FROM workspace_records WHERE company_id=? AND resource=? ORDER BY id LIMIT 1000").all(companyId, resource).map(row => object(JSON.parse(String(row.record))));
  }
  get(companyId: string, resource: WorkspaceResource, id: unknown): Record<string, unknown> | undefined {
    if (typeof id !== "number" && typeof id !== "string") throw new Error("Record ID is required");
    const row = this.database.prepare("SELECT record FROM workspace_records WHERE company_id=? AND resource=? AND (id=? OR uuid=?)").get(companyId, resource, id, String(id));
    return row ? object(JSON.parse(String(row.record))) : undefined;
  }
  save(companyId: string, resource: WorkspaceResource, value: unknown, id?: unknown): Record<string, unknown> {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const existing = id === undefined ? undefined : this.get(companyId, resource, id);
      if (id !== undefined && !existing) throw new Error("Record not found");
      if (!existing && (resource === "company" || resource === "invoice-settings") && this.list(companyId, resource).length) throw new Error("Workspace settings record already exists");
      const details = validateWorkspaceRecord(resource, { ...existing, ...object(value) });
      if (resource === "employees") {
        const groups = details.groupIds as number[];
        for (const groupId of groups) if (!this.get(companyId, "employee-groups", groupId)) throw new Error("Contact group not found");
      }
      const now = new Date().toISOString();
      const uuid = existing?.uuid || randomUUID();
      const next = { ...details, uuid, companyId, createdAt: existing?.createdAt || now, updatedAt: now };
      const recordId = existing?.id ?? Number(this.database.prepare("INSERT INTO workspace_records(company_id,resource,uuid,record) VALUES(?,?,?,?)").run(companyId, resource, String(uuid), "{}").lastInsertRowid);
      const record = { ...next, id: recordId };
      this.database.prepare("UPDATE workspace_records SET record=? WHERE id=? AND company_id=?").run(JSON.stringify(record), Number(recordId), companyId);
      this.database.exec("COMMIT");
      return record;
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  delete(companyId: string, resource: WorkspaceResource, ids: unknown) {
    if (resource === "company") throw new Error("Company treasury records cannot be deleted from profile settings");
    if (!Array.isArray(ids) || !ids.length || ids.length > 1000) throw new Error("Record IDs are required");
    this.database.exec("BEGIN IMMEDIATE");
    try {
      let deleted = 0;
      for (const id of ids) {
        const record = this.get(companyId, resource, id);
        if (!record) continue;
        if (resource === "employee-groups" && this.list(companyId, "employees").some(employee => Array.isArray(employee.groupIds) && employee.groupIds.includes(record.id))) throw new Error("Remove contacts from this group first");
        deleted += Number(this.database.prepare("DELETE FROM workspace_records WHERE company_id=? AND resource=? AND id=?").run(companyId, resource, Number(record.id)).changes);
      }
      this.database.exec("COMMIT");
      return { deleted };
    } catch (error) { this.database.exec("ROLLBACK"); throw error; }
  }
  close() { this.database.close(); }
}

export function openWorkspace() {
  const path = resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  return new WorkspaceRepository(path);
}
