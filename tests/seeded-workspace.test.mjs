import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SeededWorkspaceRepository } from "../services/server/seeded-workspace.ts";

test("seeded workspaces preserve edits and isolate companies with revision checks", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-seed-"));
  const data = JSON.parse(readFileSync("public/demo-data-entity-3.json", "utf8"));
  const repository = new SeededWorkspaceRepository(join(directory, "business.sqlite"));
  try {
    assert.equal(repository.seed("company", "entity-3", data), true);
    const original = repository.get("company", "entity-3");
    const company = { ...data.company, companyName: "Saved company" };
    repository.update("company", "entity-3", original.revision, [{ field: "company", value: company }]);
    assert.equal(repository.seed("company", "entity-3", data), false);
    assert.equal(repository.get("company", "entity-3").data.company.companyName, "Saved company");
    assert.throws(() => repository.get("other", "entity-3"), /not been seeded/);
    assert.throws(() => repository.update("company", "entity-3", original.revision, []), /another session/);
    const current = repository.get("company", "entity-3");
    assert.throws(() => repository.update("company", "entity-3", current.revision, [{ field: "totalBalance", value: 100000 }]), /verified/);
    assert.throws(() => repository.update("company", "entity-3", current.revision, [{ field: "invoices", value: [{ uuid: "forged", status: "PAID", txHash: "fake" }] }]), /verified/);
    assert.equal(repository.get("company", "entity-3").revision, current.revision);
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});
