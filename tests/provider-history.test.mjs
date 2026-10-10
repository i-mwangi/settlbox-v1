import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProviderHistoryRepository } from "../services/server/provider-history.ts";
import { recordBalanceObservation } from "../services/server/balance-history.ts";

test("provider examples survive reopening without overwriting history or leaking across entities", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-provider-history-"));
  const file = join(directory, "records.sqlite");
  let repository = new ProviderHistoryRepository(file);
  try {
    const history = { globalAccounts: { accounts: [], deposits: [] }, yield: { apy: 4, monthly: [], activity: [] } };
    repository.seed("company-a", "entity-3", history);
    repository.seed("company-a", "entity-3", { ...history, yield: { ...history.yield, apy: 5 } });
    repository.close();
    repository = new ProviderHistoryRepository(file);
    assert.equal(repository.get("company-a", "entity-3").yield.apy, 4);
    assert.equal(repository.get("company-a", "primary").yield.apy, 0);
    assert.equal(repository.get("company-b", "entity-3").yield.apy, 0);
  } finally { repository.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("observed balances retain the latest hourly value and isolate wallets and companies", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-observations-"));
  const previous = process.env.SETTLBOX_BUSINESS_DATABASE;
  process.env.SETTLBOX_BUSINESS_DATABASE = join(directory, "records.sqlite");
  try {
    recordBalanceObservation("company-a", "entity-3", "wallet-a", "20");
    const rows = recordBalanceObservation("company-a", "entity-3", "wallet-a", "19.99");
    assert.equal(rows.at(-1).amount, "19.99");
    assert.equal(recordBalanceObservation("company-b", "entity-3", "wallet-a", "2").length, 1);
    assert.equal(recordBalanceObservation("company-a", "primary", "wallet-a", "3").length, 1);
    assert.equal(recordBalanceObservation("company-a", "entity-3", "wallet-b", "4").length, 1);
  } finally {
    if (previous === undefined) delete process.env.SETTLBOX_BUSINESS_DATABASE;
    else process.env.SETTLBOX_BUSINESS_DATABASE = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
