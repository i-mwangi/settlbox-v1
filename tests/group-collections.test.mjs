import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { GroupCollectionRepository, splitCollectionAmount } from "../services/server/group-collections.ts";
import { PaymentLinkRepository } from "../services/server/payment-links.ts";
import { parseAmount } from "../services/arc/amount.ts";

test("collection allocation conserves every USDC unit without floating-point rounding", () => {
  for (const count of [1, 3, 7, 100]) {
    const amounts = splitCollectionAmount("1.000000000000000001", count);
    assert.equal(amounts.reduce((sum, amount) => sum + parseAmount(amount), 0n), parseAmount("1.000000000000000001"));
    assert.ok(amounts.every(amount => parseAmount(amount) > 0n));
  }
  assert.throws(() => splitCollectionAmount("0.000000000000000001", 2), /too small/);
  assert.throws(() => splitCollectionAmount("1", 101), /100/);
});

test("collections persist idempotently and paid contributions cannot be edited or collected twice", () => {
  const directory = mkdtempSync(join(tmpdir(), "settlbox-collections-"));
  const path = join(directory, "business.sqlite");
  const links = new PaymentLinkRepository(path);
  const collections = new GroupCollectionRepository(path);
  const wallet = "0x6672ad05c24f1e111e0d5354a8bb4e74053395f5";
  const id = randomUUID();
  try {
    const record = collections.create("company", id, "Services", "0.001", null, [{ name: "Contributor 1", address: null }, { name: "Contributor 2", address: null }]);
    assert.deepEqual(collections.create("company", id, "Services", "0.001", null, [{ name: "Contributor 1", address: null }, { name: "Contributor 2", address: null }]), record);
    assert.throws(() => collections.create("company", id, "Services", "0.002", null, [{ name: "Contributor 1", address: null }]), /different request/);
    assert.throws(() => collections.create("company", id, "Services", "0.001", null, [{ name: "Contributor 1", address: null }]), /different request/);
    assert.deepEqual(collections.list("another"), []);
    const collection = collections.hydrate(record, wallet, links);
    const member = collection.members[0];
    assert.equal(member.paid, false);
    assert.throws(() => links.update(member.linkCode, { amount: "1" }), /collection/);
    assert.throws(() => links.delete([member.linkCode]), /collection/);
    const hash = `0x${"a".repeat(64)}`;
    links.record(member.linkCode, hash, wallet, member.amount);
    assert.equal(collections.hydrate(record, wallet, links).members[0].paid, true);
    assert.equal(links.get(member.linkCode).status, "DEACTIVATED");
    assert.equal(links.record(member.linkCode, hash, wallet, member.amount).records.length, 1);
    assert.throws(() => links.record(member.linkCode, `0x${"b".repeat(64)}`, wallet, member.amount), /inactive/);
    assert.equal(collections.hydrate(record, wallet, links).members[1].paid, false);
    const rotatedWallet = `0x${"2".repeat(40)}`;
    collections.hydrate(record, rotatedWallet, links);
    assert.equal(links.get(member.linkCode).paymentWalletAddress, wallet);
  } finally { collections.close(); links.close(); rmSync(directory, { recursive: true }); }
});
