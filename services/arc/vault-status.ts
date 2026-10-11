import { getAddress } from "viem";
import type { TreasuryVaultConfiguration } from "../../types/treasury-vault.ts";

export function validateVaultConfiguration(value: unknown, companyId: string): TreasuryVaultConfiguration {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Vault configuration is required");
  const input = value as Record<string, unknown>;
  if (input.chainId !== 5042002 || input.companyId !== companyId) throw new Error("Vault network or company does not match the treasury");
  const address = (field: string) => {
    const candidate = input[field];
    if (typeof candidate !== "string" || !/^0x[0-9a-f]{40}$/i.test(candidate) || /^0x0{40}$/i.test(candidate)) throw new Error(`Invalid vault ${field}`);
    return getAddress(candidate);
  };
  const result = { chainId: 5042002, companyId, address: address("address"), administrator: address("administrator"), executor: address("executor") };
  if (result.administrator === result.executor || result.address === result.administrator || result.address === result.executor) throw new Error("Vault, administrator and executor must have distinct addresses");
  return result;
}

export function verifyVaultIdentity(config: TreasuryVaultConfiguration, observed: { chainId: number; runtimeHash: string | undefined; administrator: string; executor: string }, expectedRuntimeHash: string) {
  if (observed.chainId !== config.chainId || observed.runtimeHash !== expectedRuntimeHash) throw new Error("Vault network or deployed bytecode could not be verified");
  if (observed.administrator.toLowerCase() !== config.administrator.toLowerCase() || observed.executor.toLowerCase() !== config.executor.toLowerCase()) throw new Error("Vault administrator or executor differs from the configured identity");
}
