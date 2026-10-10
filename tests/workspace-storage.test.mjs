import test from "node:test";
import assert from "node:assert/strict";
import { readWorkspaceStorage } from "../services/utils/workspace-storage.ts";

function memoryStorage(entries) {
  const values = new Map(entries);
  return {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("a previous batch draft is copied without removing the original", () => {
  const draft = JSON.stringify({ state: { transactions: { wallet: [{ id: "draft-1" }] } }, version: 0 });
  const storage = memoryStorage([["previous-batch-transactions", draft]]);
  assert.equal(readWorkspaceStorage(storage, "settlbox-batch-transactions", "-batch-transactions"), draft);
  assert.equal(storage.getItem("previous-batch-transactions"), draft);
  assert.equal(storage.getItem("settlbox-batch-transactions"), draft);
});

test("current drafts take precedence and ambiguous previous drafts remain untouched", () => {
  const storage = memoryStorage([["settlbox-batch-transactions", "current"], ["previous-batch-transactions", "previous"]]);
  assert.equal(readWorkspaceStorage(storage, "settlbox-batch-transactions", "-batch-transactions"), "current");
  const ambiguous = memoryStorage([["first-batch-transactions", "first"], ["second-batch-transactions", "second"]]);
  assert.equal(readWorkspaceStorage(ambiguous, "settlbox-batch-transactions", "-batch-transactions"), null);
  assert.equal(ambiguous.length, 2);
});
