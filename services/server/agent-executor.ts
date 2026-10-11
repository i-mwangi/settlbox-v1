import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, http, keccak256, type Hex } from "viem";
import artifact from "../../contracts/artifacts/SettlboxTreasuryVault.json";
import { arcTestnet } from "../arc/network";
import { treasuryVaultAbi } from "../arc/treasury-vault";
import { validateVaultConfiguration } from "../arc/vault-status";

export async function verifiedAgentExecutor(companyId: string) {
  const record = JSON.parse(readFileSync(resolve(process.env.SETTLBOX_AGENT_EXECUTOR_CONFIG || ".data/agent-executor.json"), "utf8"));
  if (!process.env.CIRCLE_API_KEY) throw new Error("Circle execution configuration is required");
  const response = await fetch(`https://api.circle.com/v1/w3s/wallets/${encodeURIComponent(record.walletId)}`, { headers: { Authorization: `Bearer ${process.env.CIRCLE_API_KEY}` }, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) throw new Error("Circle execution wallet could not be verified");
  const wallet = (await response.json()).data?.wallet;
  if (record.companyId !== companyId || wallet?.custodyType !== "DEVELOPER" || wallet.blockchain !== "ARC-TESTNET" || wallet.address.toLowerCase() !== record.address.toLowerCase()) throw new Error("Circle execution wallet verification failed");
  return { walletId: wallet.id, address: wallet.address as `0x${string}` };
}

export async function reconcileAgentExecutor(companyId: string) {
  const target = await verifiedAgentExecutor(companyId);
  const path = resolve(process.env.SETTLBOX_TREASURY_VAULT_CONFIG || ".data/treasury-vault.json");
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const config = validateVaultConfiguration(raw, companyId);
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
  if (await reader.getChainId() !== config.chainId) throw new Error("Wrong execution network");
  const blockNumber = await reader.getBlockNumber();
  const [code, owner, executor, paused] = await Promise.all([
    reader.getCode({ address: config.address, blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "owner", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "executor", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "paused", blockNumber }),
  ]);
  if (!code || keccak256(code) !== keccak256(artifact.deployedBytecode as Hex) || owner.toLowerCase() !== config.administrator.toLowerCase()) throw new Error("Vault identity verification failed");
  if (executor.toLowerCase() !== target.address.toLowerCase()) throw new Error("Circle executor assignment has not confirmed on Arc");
  if (!paused) throw new Error("Keep the vault paused during execution setup");
  validateVaultConfiguration({ ...raw, executor }, companyId);
  if (config.executor.toLowerCase() !== executor.toLowerCase()) {
    const temp = `${path}.executor.tmp`;
    writeFileSync(temp, JSON.stringify({ ...raw, executor, previousExecutor: config.executor, executorVerifiedAtBlock: blockNumber.toString() }, null, 2) + "\n");
    renameSync(temp, path);
  }
  return { verified: true, executor, blockNumber: blockNumber.toString() };
}
