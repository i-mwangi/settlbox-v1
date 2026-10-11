import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { keccak256 } from "viem";
import { prepareVaultDeployment } from "../services/arc/treasury-vault.ts";

try {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error("Provide the path to a vault deployment input JSON file. See docs/treasury-vault.md. No transaction will be submitted.");
  const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const artifact = JSON.parse(readFileSync("contracts/artifacts/SettlboxTreasuryVault.json", "utf8"));
  const prepared = prepareVaultDeployment(input, artifact.bytecode);
  mkdirSync(".data", { recursive: true });
  const output = ".data/treasury-vault-deployment-plan.json";
  writeFileSync(output, JSON.stringify({
    ...prepared, nativeUsdcDecimals: 18, runtimeHash: keccak256(artifact.deployedBytecode),
    status: "prepared_only", createdAt: new Date().toISOString(),
  }, (_, value) => typeof value === "bigint" ? value.toString() : value, 2));
  console.log(`Vault deployment plan saved to ${output}. No transaction submitted.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Vault preparation failed");
  process.exitCode = 1;
}
