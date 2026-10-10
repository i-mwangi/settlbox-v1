import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { createPublicClient, http } from "viem";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { arcTestnet } from "../services/arc/network.ts";
import { giftEscrowAbi } from "../services/arc/gift-escrow.ts";

async function main() {
  const config = JSON.parse(readFileSync(".data/gift-escrow.json", "utf8"));
  const wallet = JSON.parse(readFileSync(".data/circle-testnet-verification.json", "utf8")).destination;
  assert.equal(config.chainId, arcTestnet.id);
  assert.equal(wallet.chainId, arcTestnet.id);
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
  assert.equal(await reader.getChainId(), arcTestnet.id);
  const circle = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY, entitySecret: process.env.CIRCLE_ENTITY_SECRET });
  const path = ".data/gift-verification.json";
  const state = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { contract: config.address, claimId: `0x${randomBytes(32).toString("hex")}`, refundId: `0x${randomBytes(32).toString("hex")}`, transactions: {} };
  assert.equal(state.contract, config.address);
  const save = () => writeFileSync(path, JSON.stringify(state, null, 2));
  save();
  async function transact(name, functionName, args, amount = "0") {
    state.transactions[name] ||= { key: randomUUID() };
    const step = state.transactions[name];
    save();
    if (!step.id) {
      const result = await circle.createContractExecutionTransaction({ walletId: wallet.id, contractAddress: config.address, abiFunctionSignature: functionName, abiParameters: args, amount, idempotencyKey: step.key, fee: { type: "level", config: { feeLevel: "MEDIUM" } } });
      assert.ok(result.data?.id);
      step.id = result.data.id;
      save();
    }
    for (let attempt = 0; attempt < 40; attempt++) {
      const transaction = (await circle.getTransaction({ id: step.id })).data?.transaction;
      assert.ok(transaction && !["FAILED", "DENIED", "CANCELLED"].includes(transaction.state), `${name} failed: ${transaction?.errorReason || transaction?.state}`);
      if (transaction.txHash && transaction.state === "COMPLETE") {
        const receipt = await reader.getTransactionReceipt({ hash: transaction.txHash });
        assert.equal(receipt.status, "success");
        step.hash = transaction.txHash;
        save();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error(`${name} is still pending; rerun verification to reconcile it`);
  }
  const read = id => reader.readContract({ address: config.address, abi: giftEscrowAbi, functionName: "gifts", args: [id] });
  state.claimExpiry ||= Math.floor(Date.now() / 1000) + 86400;
  save();
  await transact("fundClaim", "createGift(bytes32,address,uint64)", [state.claimId, wallet.address, String(state.claimExpiry)], "0.001");
  assert.equal((await read(state.claimId))[2], 1000000000000000n);
  const claimBefore = (await read(state.claimId))[4];
  if (claimBefore === 1) {
    const balance = await reader.getBalance({ address: config.address });
    await transact("claim", "claimGift(bytes32)", [state.claimId]);
    assert.equal(await reader.getBalance({ address: config.address }), balance - 1000000000000000n);
  }
  assert.equal((await read(state.claimId))[4], 2);
  console.log("Arc Testnet funded gift claim confirmed");
  state.refundExpiry ||= Math.floor(Date.now() / 1000) + 120;
  save();
  await transact("fundRefund", "createGift(bytes32,address,uint64)", [state.refundId, wallet.address, String(state.refundExpiry)], "0.001");
  while (Number((await reader.getBlock()).timestamp) < state.refundExpiry) await new Promise(resolve => setTimeout(resolve, 3000));
  if ((await read(state.refundId))[4] === 1) {
    const balance = await reader.getBalance({ address: config.address });
    await transact("refund", "refundGift(bytes32)", [state.refundId]);
    assert.equal(await reader.getBalance({ address: config.address }), balance - 1000000000000000n);
  }
  assert.equal((await read(state.refundId))[4], 3);
  console.log("Arc Testnet expired gift refund confirmed");
}

main().catch(error => { console.error(error instanceof Error ? error.message.slice(0, 400) : "Gift verification failed"); process.exitCode = 1; });
