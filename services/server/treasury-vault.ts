import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, http, keccak256, type Hex } from "viem";
import artifact from "../../contracts/artifacts/SettlboxTreasuryVault.json";
import { arcTestnet } from "../arc/network";
import { formatAmount } from "../arc/amount";
import { treasuryVaultAbi } from "../arc/treasury-vault";
import { validateVaultConfiguration, verifyVaultIdentity } from "../arc/vault-status";
import type { TreasuryVaultStatus } from "../../types/treasury-vault";

export async function readTreasuryVaultStatus(companyId: string): Promise<TreasuryVaultStatus> {
  const path = resolve(process.env.SETTLBOX_TREASURY_VAULT_CONFIG || ".data/treasury-vault.json");
  if (!existsSync(path)) return { state: "not_configured", message: "The treasury vault is not deployed or configured. Current treasury payments do not use this vault." };
  const config = validateVaultConfiguration(JSON.parse(readFileSync(path, "utf8")), companyId);
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0], { timeout: 10000, retryCount: 1 }) });
  const chainId = await reader.getChainId();
  if (chainId !== config.chainId) throw new Error("Vault RPC network does not match Arc Testnet");
  const blockNumber = await reader.getBlockNumber();
  const [code, administrator, executor, paused, policy, policyVersion, lifetimeSpent, balance, approverCount] = await Promise.all([
    reader.getCode({ address: config.address, blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "owner", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "executor", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "paused", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "policy", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "policyVersion", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "lifetimeSpent", blockNumber }),
    reader.getBalance({ address: config.address, blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "approverCount", blockNumber }),
  ]);
  verifyVaultIdentity(config, { chainId, runtimeHash: code && code !== "0x" ? keccak256(code) : undefined, administrator, executor }, keccak256(artifact.deployedBytecode as Hex));
  return {
    state: "verified", chainId, address: config.address, administrator, executor, paused,
    approvalCapacityReady: approverCount >= policy[5], balanceUsdc: formatAmount(balance), lifetimeSpentUsdc: formatAmount(lifetimeSpent), policyVersion: policyVersion.toString(),
    policy: { paymentLimitUsdc: formatAmount(policy[0]), dailyLimitUsdc: formatAmount(policy[1]), lifetimeLimitUsdc: formatAmount(policy[2]), approvalThresholdUsdc: formatAmount(policy[3]), liquidityFloorUsdc: formatAmount(policy[4]), requiredApprovals: policy[5] },
    blockNumber: blockNumber.toString(), observedAt: new Date().toISOString(),
  };
}
