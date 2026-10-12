import test from "node:test";
import assert from "node:assert/strict";
import { validateVaultConfiguration, verifyVaultIdentity } from "../services/arc/vault-status.ts";

const config = { chainId: 5042002, companyId: "company", address: `0x${"1".repeat(40)}`, administrator: `0x${"2".repeat(40)}`, executor: `0x${"3".repeat(40)}` };
const hash = `0x${"a".repeat(64)}`;

test("vault configuration rejects other companies, networks and overlapping control addresses", () => {
  assert.deepEqual(validateVaultConfiguration(config, "company"), config);
  assert.throws(() => validateVaultConfiguration(config, "another"), /company/);
  assert.throws(() => validateVaultConfiguration({ ...config, chainId: 1 }, "company"), /network/);
  assert.throws(() => validateVaultConfiguration({ ...config, executor: config.administrator }, "company"), /distinct/);
  assert.throws(() => validateVaultConfiguration({ ...config, executor: `0x${"0".repeat(40)}` }, "company"), /Invalid/);
});

test("vault verification fails closed for missing code, changed bytecode or changed control wallets", () => {
  const observed = { chainId: 5042002, runtimeHash: hash, administrator: config.administrator, executor: config.executor };
  assert.doesNotThrow(() => verifyVaultIdentity(config, observed, hash));
  assert.throws(() => verifyVaultIdentity(config, { ...observed, runtimeHash: undefined }, hash), /bytecode/);
  assert.throws(() => verifyVaultIdentity(config, { ...observed, runtimeHash: `0x${"b".repeat(64)}` }, hash), /bytecode/);
  assert.throws(() => verifyVaultIdentity(config, { ...observed, chainId: 1 }, hash), /network/);
  assert.throws(() => verifyVaultIdentity(config, { ...observed, administrator: config.address }, hash), /administrator/);
  assert.throws(() => verifyVaultIdentity(config, { ...observed, executor: config.address }, hash), /executor/);
});
