import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createPublicClient, http, keccak256, formatUnits } from "viem";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";
import { arcTestnet } from "../services/arc/network.ts";
import { prepareVaultDeployment, treasuryVaultAbi } from "../services/arc/treasury-vault.ts";

async function main() {
  const artifact = JSON.parse(readFileSync("contracts/artifacts/SettlboxTreasuryVault.json", "utf8"));
  const input = JSON.parse(readFileSync(".data/treasury-vault-deployment-input.json", "utf8"));
  const plan = prepareVaultDeployment(input, artifact.bytecode);
  const runtimeHash = keccak256(artifact.deployedBytecode);
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
  if (await reader.getChainId() !== arcTestnet.id) throw new Error("Arc Testnet is required");
  const credentials = { apiKey: process.env.CIRCLE_API_KEY, entitySecret: process.env.CIRCLE_ENTITY_SECRET };
  const circle = initiateDeveloperControlledWalletsClient(credentials);
  const contracts = initiateSmartContractPlatformClient(credentials);
  const journalPath = ".data/treasury-vault-deployment.json";
  let state = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, "utf8")) : undefined;
  const wallet = JSON.parse(readFileSync(".data/circle-testnet-verification.json", "utf8")).destination;
  const current = (await circle.getWallet({ id: wallet.id })).data?.wallet;
  if (wallet.chainId !== arcTestnet.id || current?.blockchain !== "ARC-TESTNET" || current.address.toLowerCase() !== wallet.address.toLowerCase()) throw new Error("Isolated deployer identity mismatch");
  if (plan.administrator.toLowerCase() === current.address.toLowerCase() || plan.executor.toLowerCase() === current.address.toLowerCase()) throw new Error("Deployer must be separate from vault control wallets");
  if (!state) {
    const gas = (await reader.estimateGas({ account: wallet.address, data: plan.data })) * 12n / 10n;
    const fees = await reader.estimateFeesPerGas();
    if (!fees.maxFeePerGas || !fees.maxPriorityFeePerGas || gas * fees.maxFeePerGas > 100000000000000000n) throw new Error("Deployment exceeds the 0.1 test-USDC fee ceiling");
    if (await reader.getBalance({ address: wallet.address }) < gas * fees.maxFeePerGas) throw new Error("Deployment wallet needs test USDC for gas");
    state = { chainId: arcTestnet.id, deploymentHash: plan.deploymentHash, runtimeHash, walletId: wallet.id, idempotencyKey: randomUUID(), fee: { type: "absolute", config: { gasLimit: gas.toString(), maxFee: formatUnits(fees.maxFeePerGas, 9), priorityFee: formatUnits(fees.maxPriorityFeePerGas, 9) } } };
    writeFileSync(journalPath, JSON.stringify(state, null, 2));
  }
  if (state.chainId !== arcTestnet.id || state.deploymentHash !== plan.deploymentHash || state.runtimeHash !== runtimeHash || state.walletId !== wallet.id) throw new Error("Deployment journal does not match the confirmed plan");
  if (!state.contractId) {
    const p = plan.policy;
    const result = (await contracts.deployContract({ name: "SettlboxTreasuryVault", walletId: state.walletId, blockchain: "ARC-TESTNET", abiJson: JSON.stringify(artifact.abi), bytecode: artifact.bytecode, constructorParameters: [plan.administrator, plan.executor, [p.paymentLimit.toString(), p.dailyLimit.toString(), p.lifetimeLimit.toString(), p.approvalThreshold.toString(), p.liquidityFloor.toString(), p.requiredApprovals]], fee: state.fee, idempotencyKey: state.idempotencyKey })).data;
    if (!result?.contractId || !result.transactionId) throw new Error("Circle did not return a deployment identity");
    Object.assign(state, result);
    writeFileSync(journalPath, JSON.stringify(state, null, 2));
  }
  const transaction = (await circle.getTransaction({ id: state.transactionId })).data?.transaction;
  if (!transaction || ["FAILED", "DENIED", "CANCELLED"].includes(transaction.state)) throw new Error(`Deployment state: ${transaction?.state || "unknown"}`);
  if (!transaction.txHash) { console.log("Vault deployment submitted; rerun this command to reconcile the same deployment."); return; }
  const receipt = await reader.waitForTransactionReceipt({ hash: transaction.txHash, timeout: 60000 });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Vault deployment failed");
  const address = receipt.contractAddress;
  const code = await reader.getCode({ address });
  if (!code || keccak256(code) !== runtimeHash) throw new Error("Vault bytecode verification failed");
  const read = functionName => reader.readContract({ address, abi: treasuryVaultAbi, functionName });
  const [owner, executor, paused, policy] = await Promise.all([read("owner"), read("executor"), read("paused"), read("policy")]);
  if (owner.toLowerCase() !== plan.administrator.toLowerCase() || executor.toLowerCase() !== plan.executor.toLowerCase() || !paused || policy.map(String).join() !== Object.values(plan.policy).map(String).join()) throw new Error("Vault roles, pause state or policy do not match the confirmed plan");
  const companyId = JSON.parse(readFileSync(process.env.SETTLBOX_TREASURY_CONFIG || ".data/treasury-config.json", "utf8")).wallet.companyId;
  writeFileSync(process.env.SETTLBOX_TREASURY_VAULT_CONFIG || ".data/treasury-vault.json", JSON.stringify({ chainId: arcTestnet.id, companyId, address, administrator: plan.administrator, executor: plan.executor, runtimeHash, transactionHash: transaction.txHash }, null, 2));
  console.log(`Vault verified on Arc Testnet at ${address}. Paused; no funds allocated.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message.slice(0, 350) : "Vault deployment failed"); process.exitCode = 1; });
