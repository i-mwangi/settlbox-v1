import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SeededWorkspaceRepository } from "../services/server/seeded-workspace.ts";
import { PayrollContractRepository, payrollDate, validatePayrollContract } from "../services/server/payroll-contracts.ts";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-payroll-"));
  const path = join(directory, "business.sqlite");
  const data = JSON.parse(readFileSync("public/demo-data-entity-3.json", "utf8"));
  data.employees[0].walletAddress = "0x1111111111111111111111111111111111111111";
  data.employees[0].isActive = true;
  const seed = new SeededWorkspaceRepository(path);
  seed.seed("company", "entity-3", data);
  const payroll = new PayrollContractRepository(path);
  const input = { employeeId: data.employees[0].id, amount: "0.001", payday: 31, payrollCycle: 3, joiningDate: "2026-01-01", contractTerm: "CONTRACTOR", description: "Test delivery", generateDaysBefore: 5 };
  return { path, seed, payroll, input, close() { payroll.close(); seed.close(); rmSync(directory, { recursive: true }); } };
}

test("payroll dates clamp to the calendar and terms reject unsupported settlement", () => {
  assert.equal(payrollDate("2028-01-31", 1, 31), "2028-02-29");
  assert.equal(payrollDate("2027-01-31", 1, 31), "2027-02-28");
  const state = fixture();
  try {
    assert.throws(() => validatePayrollContract({ ...state.input, amount: "0.0000001" }), /six decimals/);
    assert.throws(() => validatePayrollContract({ ...state.input, joiningDate: "2026-02-30" }), /calendar/);
    assert.throws(() => validatePayrollContract({ ...state.input, network: { chainId: 1 } }), /Arc/);
    assert.throws(() => validatePayrollContract({ ...state.input, token: { symbol: "USDT" } }), /USDC/);
  } finally { state.close(); }
});

test("payroll confirmation atomically creates one unpaid bill and one canonical payment", () => {
  const state = fixture();
  try {
    const contract = state.payroll.save("company", "entity-3", state.input);
    assert.throws(() => state.payroll.get("other", "entity-3", contract.id), /not found/);
    assert.throws(() => state.payroll.get("company", "primary", contract.id), /not found/);
    assert.throws(() => state.payroll.save("company", "entity-3", state.input), /already has/);
    const invoice = state.payroll.prepare("company", "entity-3", contract.id, 0);
    assert.equal(state.payroll.prepare("company", "entity-3", contract.id, 0).uuid, invoice.uuid);
    assert.throws(() => state.payroll.save("company", "entity-3", { amount: "1" }, contract.id), /cannot be edited/);
    const bill = state.payroll.confirm("company", "entity-3", invoice.uuid);
    assert.equal(state.payroll.confirm("company", "entity-3", invoice.uuid).uuid, bill.uuid);
    assert.equal(bill.amountExact, "0.001");
    assert.equal(bill.status, "PENDING");
    const saved = state.seed.get("company", "entity-3");
    assert.equal(saved.data.invoices.find(item => item.uuid === invoice.uuid).status, "CONFIRMED");
    assert.equal(saved.data.bills.filter(item => item.invoiceUuid === invoice.uuid).length, 1);
    const database = new DatabaseSync(state.path);
    try {
      const record = JSON.parse(database.prepare("SELECT record FROM business_records WHERE id=?").get(bill.businessRecordId).record);
      assert.equal(record.status, "draft");
      assert.equal(record.kind, "payroll");
      assert.equal(record.transactionHash, null);
      const outbox = database.prepare("SELECT status,recipient FROM email_outbox WHERE event_key=?").all(`payroll-invoice:${invoice.uuid}`);
      assert.equal(outbox.length, 1);
      assert.equal(outbox[0].status, "QUEUED");
      assert.equal(outbox[0].recipient, contract.employee.email);
    } finally { database.close(); }
    assert.throws(() => state.seed.update("company", "entity-3", saved.revision, [{ field: "bills", value: saved.data.bills.filter(item => item.uuid !== bill.uuid) }]), /verified/);
    assert.throws(() => state.seed.update("company", "entity-3", saved.revision, [{ field: "invoices", value: saved.data.invoices.map(item => item.uuid === invoice.uuid ? { ...item, amount: 500 } : item) }]), /verified/);
    assert.throws(() => state.seed.update("company", "entity-3", saved.revision, [{ field: "employees", value: saved.data.employees.filter(employee => employee.id !== contract.employeeId) }]), /Cancel active/);
  } finally { state.close(); }
});

test("paused and cancelled contracts stop preparation; due preparation is repeatable", () => {
  const state = fixture();
  try {
    const contract = state.payroll.save("company", "entity-3", state.input);
    state.payroll.setStatus("company", "entity-3", contract.id, "PAUSED");
    assert.throws(() => state.payroll.prepare("company", "entity-3", contract.id, 0), /active/);
    assert.equal(state.payroll.prepareDue("company", "entity-3", contract.payEndDate).length, 0);
    state.payroll.setStatus("company", "entity-3", contract.id, "ACTIVE");
    assert.equal(state.payroll.prepareDue("company", "entity-3", contract.payEndDate).length, 3);
    assert.equal(state.payroll.prepareDue("company", "entity-3", contract.payEndDate).length, 0);
    state.payroll.setStatus("company", "entity-3", contract.id, "CANCELLED");
    assert.throws(() => state.payroll.setStatus("company", "entity-3", contract.id, "ACTIVE"), /closed/);
    assert.throws(() => state.payroll.prepare("company", "entity-3", contract.id, 3), /period/);
  } finally { state.close(); }
});
