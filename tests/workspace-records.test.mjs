import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkspaceRepository } from "../services/server/workspace-records.ts";

const walletAddress = "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5";
test("invoice presentation persists as a single company-scoped validated record", () => fixture(repository => {
  const input = { accentColor: "#123456", footerText: "Thank you", companyTaxId: "TAX-123", showTaxId: true };
  const record = repository.save("company", "invoice-settings", input);
  assert.deepEqual(repository.list("another", "invoice-settings"), []);
  assert.throws(() => repository.save("company", "invoice-settings", input), /already exists/);
  const updated = repository.save("company", "invoice-settings", { footerText: "Updated footer" }, record.id);
  assert.equal(updated.accentColor, input.accentColor);
  assert.equal(updated.footerText, "Updated footer");
  assert.throws(() => repository.save("company", "invoice-settings", { accentColor: "red;}body{display:none" }, record.id));
  assert.throws(() => repository.save("another", "invoice-settings", input, record.id));
}));
function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-workspace-"));
  const path = join(directory, "workspace.sqlite");
  const repository = new WorkspaceRepository(path);
  try { run(repository, path); } finally { repository.close(); rmSync(directory, { recursive: true }); }
}

test("workspace contacts preserve validated payroll terms and company isolation", () => fixture((repository, path) => {
  const group = repository.save("company", "employee-groups", { name: "Operations", shape: "CIRCLE", color: "#3366ff" });
  const employee = repository.save("company", "employees", { name: "Test employee", walletAddress, groupIds: [group.id], payroll: { monthlyAmount: "0.001", paydayDay: 28, duration: 12, durationUnit: "month", description: "Services", note: "" } });
  assert.equal(employee.token.symbol, "USDC");
  assert.equal(employee.network.chainId, 5042002);
  assert.equal(employee.payroll.monthlyAmount, "0.001");
  assert.deepEqual(repository.list("another", "employees"), []);
  assert.throws(() => repository.save("another", "employees", { name: "Intruder" }, employee.id), /not found/);
  assert.equal(repository.delete("another", "employees", [employee.id]).deleted, 0);
  const reopened = new WorkspaceRepository(path);
  try { assert.equal(reopened.get("company", "employees", employee.id).walletAddress, walletAddress); } finally { reopened.close(); }
  assert.throws(() => repository.delete("company", "employee-groups", [group.id]), /Remove contacts/);
  assert.equal(repository.save("company", "employees", { isActive: false, id: 999, companyId: "another", uuid: "spoofed" }, employee.id).id, employee.id);
  assert.equal(repository.get("company", "employees", employee.id).uuid, employee.uuid);
  assert.equal(repository.get("company", "employees", employee.id).payroll.monthlyAmount, "0.001");
}));

test("workspace rejects invalid Arc addresses, missing groups, and unsupported settlement", () => fixture(repository => {
  assert.throws(() => repository.save("company", "employees", { name: "Test", walletAddress: "demo-address" }), /Arc wallet/);
  assert.throws(() => repository.save("company", "employees", { name: "Test", walletAddress, groupIds: [999] }), /group not found/);
  assert.throws(() => repository.save("company", "employees", { name: "Test", walletAddress, paymentMethod: "fiat" }), /not configured/);
  assert.throws(() => repository.save("company", "employees", { name: "Test", walletAddress, payroll: { monthlyAmount: "0.0000001", paydayDay: 28, duration: 1, durationUnit: "month" } }), /six decimals/);
  assert.equal(repository.list("company", "employees").length, 0);
}));

test("client edits persist without changing identity or removing financial history", () => fixture(repository => {
  const client = repository.save("company", "clients", { companyName: "Customer", email: "customer@example.com" });
  const edited = repository.save("company", "clients", { companyName: "Updated customer" }, client.uuid);
  assert.equal(edited.companyName, "Updated customer");
  assert.equal(edited.email, "customer@example.com");
  assert.equal(repository.delete("company", "clients", [client.uuid]).deleted, 1);
  const profile = repository.save("company", "company", { companyName: "Settlbox" });
  assert.throws(() => repository.save("company", "company", { companyName: "Duplicate" }), /already exists/);
  assert.throws(() => repository.delete("company", "company", [profile.id]), /cannot be deleted/);
}));
