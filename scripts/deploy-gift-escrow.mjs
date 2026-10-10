import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createPublicClient, formatUnits, http, keccak256 } from "viem";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";
import { arcTestnet } from "../services/arc/network.ts";

async function main() {
  const artifact = JSON.parse(readFileSync("contracts/artifacts/SettlboxGiftEscrow.json", "utf8"));
  const journalPath = ".data/gift-escrow-deployment.json";
  const configPath = ".data/gift-escrow.json";
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
  if (await reader.getChainId() !== arcTestnet.id) throw new Error("Arc Testnet is required");
  const credentials = { apiKey: process.env.CIRCLE_API_KEY, entitySecret: process.env.CIRCLE_ENTITY_SECRET };
  const circle = initiateDeveloperControlledWalletsClient(credentials);
  const contracts = initiateSmartContractPlatformClient(credentials);
  const expectedHash = keccak256(artifact.deployedBytecode);
  let state = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, "utf8")) : null;
  if (!state) {
    const wallet = JSON.parse(readFileSync(".data/circle-testnet-verification.json", "utf8")).destination;
    if (!wallet || wallet.chainId !== arcTestnet.id) throw new Error("The isolated funded verification wallet is required");
    const current = (await circle.getWallet({ id: wallet.id })).data?.wallet;
    if (current?.blockchain !== "ARC-TESTNET" || current.address.toLowerCase() !== wallet.address.toLowerCase()) throw new Error("Verification wallet mismatch");
    const estimate = await reader.estimateGas({ account: wallet.address, data: artifact.bytecode });
    const gas = estimate * 12n / 10n;
    const fees = await reader.estimateFeesPerGas();
    if (!fees.maxFeePerGas || !fees.maxPriorityFeePerGas || gas * fees.maxFeePerGas > 1000000000000000000n) throw new Error("Deployment exceeds the one-test-USDC gas ceiling");
    if (await reader.getBalance({ address: wallet.address }) < gas * fees.maxFeePerGas) throw new Error("Verification wallet needs more test USDC for gas");
    state = { chainId: arcTestnet.id, runtimeHash: expectedHash, walletId: wallet.id, idempotencyKey: randomUUID(), fee: { type: "absolute", config: { gasLimit: gas.toString(), maxFee: formatUnits(fees.maxFeePerGas, 9), priorityFee: formatUnits(fees.maxPriorityFeePerGas, 9) } } };
    writeFileSync(journalPath, JSON.stringify(state, null, 2));
  }
  if (state.chainId !== arcTestnet.id || state.runtimeHash !== expectedHash) throw new Error("Deployment journal belongs to another contract");
  if (!state.contractId) {
    const result = (await contracts.deployContract({ name: "SettlboxGiftEscrow", walletId: state.walletId, blockchain: "ARC-TESTNET", abiJson: JSON.stringify(artifact.abi), bytecode: artifact.bytecode, constructorParameters: [], fee: state.fee, idempotencyKey: state.idempotencyKey })).data;
    if (!result?.contractId || !result.transactionId) throw new Error("Circle did not return a deployment identity");
    Object.assign(state, result);
    writeFileSync(journalPath, JSON.stringify(state, null, 2));
  }
  const transaction = (await circle.getTransaction({ id: state.transactionId })).data?.transaction;
  if (!transaction || ["FAILED", "DENIED", "CANCELLED"].includes(transaction.state)) throw new Error(`Deployment transaction state: ${transaction?.state || "unknown"}`);
  if (!transaction.txHash) { console.log("Gift escrow deployment submitted; rerun to verify confirmation"); return; }
  const receipt = await reader.waitForTransactionReceipt({ hash: transaction.txHash, timeout: 60000 });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Gift escrow deployment failed");
  const code = await reader.getCode({ address: receipt.contractAddress });
  if (!code || keccak256(code) !== expectedHash) throw new Error("Deployed escrow code differs from the tested artifact");
  writeFileSync(configPath, JSON.stringify({ chainId: arcTestnet.id, address: receipt.contractAddress, runtimeHash: expectedHash, transactionHash: transaction.txHash }, null, 2));
  console.log(`Arc Testnet gift escrow verified at ${receipt.contractAddress}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message.slice(0, 400) : "Gift escrow deployment failed"); process.exitCode = 1; });
