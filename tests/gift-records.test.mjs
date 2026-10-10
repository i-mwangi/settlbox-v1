import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { GiftRepository } from "../services/server/gift-escrow.ts";

test("gift history survives retries, canonicalizes identifiers, and remains company scoped", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-gifts-"));
  const path = join(directory, "gifts.sqlite");
  let repository = new GiftRepository(path);
  const gift = { id: `0x${"a".repeat(64)}`, sender: `0x${"1".repeat(40)}`, recipient: `0x${"2".repeat(40)}`, amount: "0.001", expiresAt: 2000000000, status: "active" };
  try {
    repository.save("company", gift);
    repository.save("company", { ...gift, id: `0x${"A".repeat(64)}` });
    assert.equal(repository.list("company").length, 1);
    assert.deepEqual(repository.list("other"), []);
    assert.throws(() => repository.save("other", gift), /another record/);
    repository.close();
    repository = new GiftRepository(path);
    assert.deepEqual(repository.list("company"), [gift]);
    assert.throws(() => repository.save("company", { ...gift, id: "invalid" }));
  } finally { repository.close(); rmSync(directory, { recursive: true }); }
});
