import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, http, keccak256, type Hex } from "viem";
import artifact from "../../contracts/artifacts/SettlboxTreasuryVault.json";
import { arcTestnet } from "../arc/network";
import { treasuryVaultAbi } from "../arc/treasury-vault";
import { validateVaultConfiguration } from "../arc/vault-status";

export async function vaultOwnership(companyId: string, target: string, reconcile = false) {
  const path = resolve(process.env.SETTLBOX_TREASURY_VAULT_CONFIG || ".data/treasury-vault.json");
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const config = validateVaultConfiguration(raw, companyId);
  if (target.toLowerCase() === config.executor.toLowerCase()) throw new Error("Executor cannot own the vault");
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
  if (await reader.getChainId() !== config.chainId) throw new Error("Wrong ownership network");
  const blockNumber = await reader.getBlockNumber();
  const [code, owner, pendingOwner, executor, paused] = await Promise.all([
    reader.getCode({ address: config.address, blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "owner", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "pendingOwner", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "executor", blockNumber }),
    reader.readContract({ address: config.address, abi: treasuryVaultAbi, functionName: "paused", blockNumber }),
  ]);
  if (!code || keccak256(code) !== keccak256(artifact.deployedBytecode as Hex) || executor.toLowerCase() !== config.executor.toLowerCase()) throw new Error("Vault identity verification failed");
  if (![config.administrator.toLowerCase(), target.toLowerCase()].includes(owner.toLowerCase())) throw new Error("Unexpected vault owner");
  if (!paused) throw new Error("Pause the vault before transferring ownership");
  const accepted = owner.toLowerCase() === target.toLowerCase();
  if (reconcile && accepted && config.administrator.toLowerCase() !== target.toLowerCase()) {
    const temp = `${path}.ownership.tmp`;
    writeFileSync(temp, JSON.stringify({ ...raw, administrator: owner, ownershipVerifiedAtBlock: blockNumber.toString(), previousAdministrator: config.administrator }, null, 2) + "\n");
    renameSync(temp, path);
  }
  return { address: config.address, owner, pendingOwner, target, accepted, nominated: pendingOwner.toLowerCase() === target.toLowerCase(), chainId: config.chainId };
}
