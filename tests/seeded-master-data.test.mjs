import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SeededWorkspaceRepository } from "../services/server/seeded-workspace.ts";

test("seeded master edits validate new rows without rewriting imported history", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-master-"));
  const repository = new SeededWorkspaceRepository(join(directory, "business.sqlite"));
  const data = JSON.parse(readFileSync("public/demo-data-entity-3.json", "utf8"));
  try {
    repository.seed("company", "entity-3", data);
    let saved = repository.get("company", "entity-3");
    const employee = { ...data.employees[0], id: 900, name: "New contractor", email: "contractor@example.test", walletAddress: "0x1111111111111111111111111111111111111111", token: { symbol: "USDC" }, network: { chainId: 5042002 }, paymentMethod: "crypto" };
    assert.throws(() => repository.update("company", "entity-3", saved.revision, [{ field: "employees", value: [...saved.data.employees, { ...employee, walletAddress: "old-chain-address" }] }]), /Arc/);
    assert.throws(() => repository.update("company", "entity-3", saved.revision, [{ field: "employees", value: [...saved.data.employees, { ...employee, groupId: 999999, groupIds: [999999] }] }]), /group/);
    assert.throws(() => repository.update("company", "entity-3", saved.revision, [{ field: "employees", value: [...saved.data.employees, { ...employee, token: { symbol: "USDT" } }] }]), /USDC/);
    saved = repository.update("company", "entity-3", saved.revision, [{ field: "employees", value: [...saved.data.employees, employee] }]);
    assert.deepEqual(saved.data.employees.slice(0, data.employees.length), data.employees);
    assert.equal(saved.data.employees.at(-1).name, employee.name);
    assert.throws(() => repository.update("company", "entity-3", saved.revision, [{ field: "clients", value: [...saved.data.clients, { uuid: "bad-client", companyName: "Client", email: "invalid" }] }]), /email/);
    const client = { uuid: "saved-client", companyName: "Client", email: "client@example.test" };
    saved = repository.update("company", "entity-3", saved.revision, [{ field: "clients", value: [...saved.data.clients, client] }]);
    assert.equal(saved.data.clients.at(-1).email, client.email);
    assert.throws(() => repository.update("company", "entity-3", saved.revision, [{ field: "invoiceSettings", value: { ...saved.data.invoiceSettings, accentColor: "javascript:invalid" } }]), /accent/);
    saved = repository.update("company", "entity-3", saved.revision, [{ field: "invoiceSettings", value: { ...saved.data.invoiceSettings, defaultNote: "Saved invoice note" } }]);
    assert.equal(saved.data.invoiceSettings.defaultNote, "Saved invoice note");
    assert.throws(() => repository.update("company", "entity-3", saved.revision - 1, [{ field: "clients", value: [] }]), /another session/);
    assert.throws(() => repository.get("other", "entity-3"), /not been seeded/);
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});
