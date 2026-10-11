import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createVM } from "@ethereumjs/vm";
import { Account, createAddressFromString, hexToBytes } from "@ethereumjs/util";
import { bytesToHex, decodeFunctionResult, encodeDeployData, encodeFunctionData } from "viem";
import solc from "solc";
import { prepareVaultDeployment, treasuryVaultAbi, vaultPolicy } from "../services/arc/treasury-vault.ts";
import "../scripts/compile-treasury-vault.mjs";

const artifact = JSON.parse(readFileSync(new URL("../contracts/artifacts/SettlboxTreasuryVault.json", import.meta.url), "utf8"));
const address = digit => createAddressFromString(`0x${digit.repeat(40)}`);
const owner = address("1"), executor = address("2"), vendor = address("3"), reviewer = address("4"), reviewer2 = address("5"), stranger = address("6");
const unit = 10n ** 15n;
const id = number => `0x${BigInt(number).toString(16).padStart(64, "0")}`;
const policy = { paymentLimit: 3n * unit, dailyLimit: 5n * unit, lifetimeLimit: 8n * unit, approvalThreshold: unit, liquidityFloor: 2n * unit, requiredApprovals: 2 };
const succeeded = result => assert.equal(result.execResult.exceptionError, undefined, bytesToHex(result.execResult.returnValue));
const rejected = result => assert.ok(result.execResult.exceptionError, "Expected contract rejection");

async function fixture(initialPolicy = policy) {
  const vm = await createVM();
  await vm.stateManager.putAccount(owner, new Account(0n, 100n * unit));
  const deployment = await vm.evm.runCall({ caller: owner, data: hexToBytes(encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args: [owner.toString(), executor.toString(), initialPolicy] })), gasLimit: 10000000n });
  succeeded(deployment);
  const vault = deployment.createdAddress;
  assert.ok(vault);
  const balance = async target => (await vm.stateManager.getAccount(target))?.balance || 0n;
  async function call(caller, name, args = [], timestamp = 100n, value = 0n) {
    return vm.evm.runCall({ caller, to: vault, value, gasLimit: 3000000n, data: hexToBytes(encodeFunctionData({ abi: artifact.abi, functionName: name, args })), block: { header: { timestamp, gasLimit: 30000000n } } });
  }
  async function read(name, args = []) {
    const result = await call(owner, name, args);
    succeeded(result);
    return decodeFunctionResult({ abi: artifact.abi, functionName: name, data: bytesToHex(result.execResult.returnValue) });
  }
  succeeded(await vm.evm.runCall({ caller: owner, to: vault, value: 20n * unit, gasLimit: 100000n }));
  assert.equal(await read("paused"), true);
  succeeded(await call(owner, "setRecipient", [vendor.toString(), true]));
  succeeded(await call(owner, "setApprover", [reviewer.toString(), true]));
  succeeded(await call(owner, "setApprover", [reviewer2.toString(), true]));
  succeeded(await call(owner, "setPaused", [false]));
  async function queue(number, amount = unit, timestamp = 100n, recipient = vendor) {
    succeeded(await call(executor, "queuePayment", [id(number), recipient.toString(), amount, timestamp + 10000n], timestamp));
  }
  async function approvals(number, timestamp = 100n) {
    succeeded(await call(reviewer, "approvePayment", [id(number)], timestamp));
    succeeded(await call(reviewer2, "approvePayment", [id(number)], timestamp));
  }
  return { vm, vault, call, read, balance, queue, approvals };
}

test("vault permits bounded execution and prevents unauthorized payments and replay", async () => {
  const f = await fixture();
  rejected(await f.call(stranger, "queuePayment", [id(1), vendor.toString(), unit, 200n]));
  rejected(await f.call(executor, "queuePayment", [id(1), stranger.toString(), unit, 200n]));
  rejected(await f.call(executor, "queuePayment", [id(1), vendor.toString(), 4n * unit, 200n]));
  await f.queue(1);
  rejected(await f.call(owner, "executePayment", [id(1)]));
  succeeded(await f.call(executor, "executePayment", [id(1)]));
  assert.equal(await f.balance(vendor), unit);
  assert.equal(await f.read("lifetimeSpent"), unit);
  rejected(await f.call(executor, "executePayment", [id(1)]));
  rejected(await f.call(executor, "queuePayment", [id(1), vendor.toString(), unit, 200n]));
});

test("constructor rejects invalid limits and overlapping control wallets", async () => {
  for (const args of [
    [owner.toString(), owner.toString(), policy],
    [owner.toString(), executor.toString(), { ...policy, dailyLimit: unit }],
    [owner.toString(), executor.toString(), { ...policy, requiredApprovals: 0 }],
  ]) {
    const vm = await createVM();
    rejected(await vm.evm.runCall({ caller: owner, data: hexToBytes(encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args })), gasLimit: 10000000n }));
  }
});

test("larger payments require distinct human approvers bound to the queued terms", async () => {
  const f = await fixture();
  await f.queue(1, 2n * unit);
  rejected(await f.call(executor, "approvePayment", [id(1)]));
  rejected(await f.call(stranger, "approvePayment", [id(1)]));
  rejected(await f.call(executor, "executePayment", [id(1)]));
  succeeded(await f.call(reviewer, "approvePayment", [id(1)]));
  rejected(await f.call(reviewer, "approvePayment", [id(1)]));
  rejected(await f.call(executor, "executePayment", [id(1)]));
  succeeded(await f.call(reviewer2, "approvePayment", [id(1)]));
  succeeded(await f.call(executor, "executePayment", [id(1)]));
  assert.equal(await f.balance(vendor), 2n * unit);
});

test("daily limits reset by UTC day while lifetime limits remain cumulative", async () => {
  const f = await fixture();
  for (const n of [1, 2]) { await f.queue(n, 2n * unit); await f.approvals(n); succeeded(await f.call(executor, "executePayment", [id(n)])); }
  await f.queue(3, 2n * unit); await f.approvals(3);
  rejected(await f.call(executor, "executePayment", [id(3)]));
  assert.equal(await f.read("dailySpent", [0n]), 4n * unit);
  await f.queue(4, 3n * unit, 86400n); await f.approvals(4, 86400n);
  succeeded(await f.call(executor, "executePayment", [id(4)], 86400n));
  await f.queue(5, 2n * unit, 86400n); await f.approvals(5, 86400n);
  rejected(await f.call(executor, "executePayment", [id(5)], 86400n));
  assert.equal(await f.read("lifetimeSpent"), 7n * unit);
});

test("liquidity floor and failed transfers preserve funds and accounting", async () => {
  const f = await fixture({ ...policy, liquidityFloor: 19n * unit });
  await f.queue(1, 2n * unit); await f.approvals(1);
  rejected(await f.call(executor, "executePayment", [id(1)]));
  assert.equal(await f.read("lifetimeSpent"), 0n);
  succeeded(await f.call(owner, "setPolicy", [policy]));
  await f.queue(2);
  await f.vm.stateManager.putCode(vendor, hexToBytes("0x60006000fd"));
  rejected(await f.call(executor, "executePayment", [id(2)]));
  assert.equal(await f.balance(f.vault), 20n * unit);
  assert.equal(await f.read("lifetimeSpent"), 0n);
  assert.equal((await f.read("payments", [id(2)]))[5], 1);
  await f.vm.stateManager.putCode(vendor, new Uint8Array());
  succeeded(await f.call(executor, "executePayment", [id(2)]));
});

test("policy and approver changes invalidate earlier approvals and queued payments", async () => {
  const f = await fixture();
  await f.queue(1, 2n * unit); await f.approvals(1);
  succeeded(await f.call(owner, "setApprover", [reviewer.toString(), false]));
  rejected(await f.call(executor, "executePayment", [id(1)]));
  succeeded(await f.call(owner, "cancelPayment", [id(1)]));
  rejected(await f.call(executor, "queuePayment", [id(1), vendor.toString(), unit, 200n]));
  await f.queue(2);
  succeeded(await f.call(owner, "setRecipient", [vendor.toString(), false]));
  rejected(await f.call(executor, "executePayment", [id(2)]));
});

test("pause, expiration, cancellation and recovery cannot be bypassed by the agent", async () => {
  const f = await fixture();
  await f.queue(1);
  rejected(await f.call(executor, "executePayment", [id(1)], 10100n));
  await f.queue(2);
  rejected(await f.call(executor, "setPaused", [true]));
  rejected(await f.call(owner, "recover", [owner.toString(), unit]));
  succeeded(await f.call(owner, "setPaused", [true]));
  rejected(await f.call(executor, "executePayment", [id(2)]));
  rejected(await f.call(executor, "recover", [executor.toString(), unit]));
  succeeded(await f.call(owner, "recover", [owner.toString(), unit]));
  assert.equal(await f.balance(f.vault), 19n * unit);
  succeeded(await f.call(owner, "cancelPayment", [id(2)]));
});

test("administration and execution stay separate through role and ownership changes", async () => {
  const f = await fixture();
  rejected(await f.call(executor, "setPolicy", [policy]));
  rejected(await f.call(owner, "setApprover", [executor.toString(), true]));
  rejected(await f.call(owner, "setExecutor", [reviewer.toString()]));
  rejected(await f.call(owner, "setPolicy", [{ ...policy, paymentLimit: 0n }]));
  succeeded(await f.call(owner, "proposeOwner", [stranger.toString()]));
  rejected(await f.call(owner, "setExecutor", [stranger.toString()]));
  rejected(await f.call(reviewer, "acceptOwnership"));
  succeeded(await f.call(stranger, "acceptOwnership"));
  rejected(await f.call(owner, "setPaused", [true]));
  succeeded(await f.call(stranger, "setPaused", [true]));
});

test("typed deployment preparation matches compiled constructor encoding and uses native USDC precision", () => {
  const input = { chainId: 5042002, administrator: owner.toString(), executor: executor.toString(), policy: {
    paymentLimitUsdc: "0.003", dailyLimitUsdc: "0.005", lifetimeLimitUsdc: "0.008", approvalThresholdUsdc: "0.001", liquidityFloorUsdc: "0.002", requiredApprovals: 2,
  } };
  const prepared = prepareVaultDeployment(input, artifact.bytecode);
  assert.equal(prepared.policy.paymentLimit, 3n * unit);
  assert.equal(prepared.startsPaused, true);
  assert.equal(prepared.data, encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args: [owner.toString(), executor.toString(), policy] }));
  for (const functionName of ["queuePayment", "approvePayment", "executePayment"]) {
    const args = functionName === "queuePayment" ? [id(1), vendor.toString(), unit, 200n] : [id(1)];
    assert.equal(encodeFunctionData({ abi: treasuryVaultAbi, functionName, args }), encodeFunctionData({ abi: artifact.abi, functionName, args }));
  }
  assert.throws(() => prepareVaultDeployment({ ...input, chainId: 1 }, artifact.bytecode), /Arc Testnet/);
  assert.throws(() => prepareVaultDeployment({ ...input, executor: input.administrator }, artifact.bytecode), /different wallets/);
  assert.throws(() => vaultPolicy({ ...input.policy, requiredApprovals: 0 }), /invalid/);
  assert.throws(() => vaultPolicy({ ...input.policy, dailyLimitUsdc: "0.001" }), /invalid/);
  assert.throws(() => vaultPolicy({ ...input.policy, paymentLimitUsdc: "0.0000000000000000001" }), /precision/);
});

test("an executor contract cannot reenter to execute a second queued payment", async () => {
  const source = `pragma solidity 0.8.30;
    interface Vault { function executePayment(bytes32 id) external; }
    contract Probe {
      Vault public vault; bytes32 public next; bool public blocked;
      function configure(address target, bytes32 id) external { vault = Vault(target); next = id; }
      function start(bytes32 id) external { vault.executePayment(id); }
      receive() external payable { try vault.executePayment(next) { } catch { blocked = true; } }
    }`;
  const output = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources: { "Probe.sol": { content: source } }, settings: { evmVersion: "paris", outputSelection: { "*": { "*": ["abi", "evm.deployedBytecode.object"] } } } })));
  const probeArtifact = output.contracts["Probe.sol"].Probe;
  const f = await fixture();
  const probe = address("7");
  await f.vm.stateManager.putCode(probe, hexToBytes(`0x${probeArtifact.evm.deployedBytecode.object}`));
  const probeCall = (name, args = []) => f.vm.evm.runCall({ caller: stranger, to: probe, gasLimit: 3000000n, data: hexToBytes(encodeFunctionData({ abi: probeArtifact.abi, functionName: name, args })), block: { header: { timestamp: 100n, gasLimit: 30000000n } } });
  succeeded(await probeCall("configure", [f.vault.toString(), id(2)]));
  succeeded(await f.call(owner, "setExecutor", [probe.toString()]));
  succeeded(await f.call(owner, "setRecipient", [probe.toString(), true]));
  succeeded(await f.call(probe, "queuePayment", [id(1), probe.toString(), unit, 200n]));
  succeeded(await f.call(probe, "queuePayment", [id(2), vendor.toString(), unit, 200n]));
  succeeded(await probeCall("start", [id(1)]));
  const blocked = await probeCall("blocked");
  succeeded(blocked);
  assert.equal(decodeFunctionResult({ abi: probeArtifact.abi, functionName: "blocked", data: bytesToHex(blocked.execResult.returnValue) }), true);
  assert.equal(await f.balance(probe), unit);
  assert.equal(await f.balance(vendor), 0n);
  assert.equal(await f.read("lifetimeSpent"), unit);
  assert.equal((await f.read("payments", [id(2)]))[5], 1);
});
