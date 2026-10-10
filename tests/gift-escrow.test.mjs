import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createVM } from "@ethereumjs/vm";
import { Account, createAddressFromString, hexToBytes } from "@ethereumjs/util";
import { encodeFunctionData } from "viem";

const artifact = JSON.parse(readFileSync(new URL("../contracts/artifacts/SettlboxGiftEscrow.json", import.meta.url), "utf8"));
const sender = createAddressFromString(`0x${"1".repeat(40)}`);
const recipient = createAddressFromString(`0x${"2".repeat(40)}`);
const stranger = createAddressFromString(`0x${"3".repeat(40)}`);
const contract = createAddressFromString(`0x${"4".repeat(40)}`);
const id = `0x${"a".repeat(64)}`;
const amount = 1000000000000000n;

async function fixture() {
  const vm = await createVM();
  await vm.stateManager.putCode(contract, hexToBytes(artifact.deployedBytecode));
  await vm.stateManager.putAccount(sender, new Account(0n, amount * 10n));
  async function call(caller, functionName, args, value = 0n, timestamp = 100n) {
    return vm.evm.runCall({ caller, to: contract, value, gasLimit: 1000000n, data: hexToBytes(encodeFunctionData({ abi: artifact.abi, functionName, args })), block: { header: { timestamp, gasLimit: 30000000n } } });
  }
  const balance = async address => (await vm.stateManager.getAccount(address))?.balance || 0n;
  return { call, balance, vm };
}

test("funded gifts permit only the recipient to claim once", async () => {
  const { call, balance } = await fixture();
  assert.equal((await call(sender, "createGift", [id, recipient.toString(), 200n], amount)).execResult.exceptionError, undefined);
  assert.equal(await balance(contract), amount);
  assert.ok((await call(stranger, "claimGift", [id])).execResult.exceptionError);
  assert.ok((await call(sender, "refundGift", [id])).execResult.exceptionError);
  assert.equal((await call(recipient, "claimGift", [id])).execResult.exceptionError, undefined);
  assert.equal(await balance(recipient), amount);
  assert.equal(await balance(contract), 0n);
  assert.ok((await call(recipient, "claimGift", [id])).execResult.exceptionError);
  assert.ok((await call(sender, "refundGift", [id], 0n, 200n)).execResult.exceptionError);
});

test("expired gifts refund only the sender and reject duplicate funding", async () => {
  const { call, balance } = await fixture();
  assert.equal((await call(sender, "createGift", [id, recipient.toString(), 200n], amount)).execResult.exceptionError, undefined);
  assert.ok((await call(sender, "createGift", [id, recipient.toString(), 200n], amount)).execResult.exceptionError);
  assert.equal(await balance(contract), amount);
  assert.ok((await call(recipient, "claimGift", [id], 0n, 200n)).execResult.exceptionError);
  assert.ok((await call(stranger, "refundGift", [id], 0n, 200n)).execResult.exceptionError);
  assert.equal((await call(sender, "refundGift", [id], 0n, 200n)).execResult.exceptionError, undefined);
  assert.equal(await balance(sender), amount * 10n);
  assert.equal(await balance(contract), 0n);
  assert.ok((await call(sender, "refundGift", [id], 0n, 200n)).execResult.exceptionError);
});

test("invalid gifts cannot reserve funds", async () => {
  const { call, balance } = await fixture();
  assert.ok((await call(sender, "createGift", [id, recipient.toString(), 100n], amount)).execResult.exceptionError);
  assert.ok((await call(sender, "createGift", [id, recipient.toString(), 200n])).execResult.exceptionError);
  assert.ok((await call(sender, "createGift", [id, `0x${"0".repeat(40)}`, 200n], amount)).execResult.exceptionError);
  assert.equal(await balance(contract), 0n);
  assert.equal(await balance(sender), amount * 10n);
});

test("a failed recipient transfer leaves funds refundable to the sender", async () => {
  const { call, balance, vm } = await fixture();
  await vm.stateManager.putCode(recipient, hexToBytes("0x60006000fd"));
  assert.equal((await call(sender, "createGift", [id, recipient.toString(), 200n], amount)).execResult.exceptionError, undefined);
  assert.ok((await call(recipient, "claimGift", [id])).execResult.exceptionError);
  assert.equal(await balance(contract), amount);
  assert.equal((await call(sender, "refundGift", [id], 0n, 200n)).execResult.exceptionError, undefined);
  assert.equal(await balance(sender), amount * 10n);
});
