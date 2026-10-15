import { arcReadTransport } from "./arc-read-transport.ts";
import { openVaultPayments } from "./vault-payments";
import { readTreasuryVaultStatus } from "./treasury-vault";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "../arc/network";
import { treasuryVaultAbi } from "../arc/treasury-vault";
import { parseAmount } from "../arc/amount";
import type { BusinessRecord } from "../../types/business";
import type { AgentPlanningContext } from "../../types/agent";
export async function vaultPlanningContext(companyId: string, records: BusinessRecord[], observed?: Awaited<ReturnType<typeof readTreasuryVaultStatus>>): Promise<AgentPlanningContext> {
  const vault = observed ?? await readTreasuryVaultStatus(companyId);
  if (vault.state !== "verified") throw new Error("Verified vault is required for planning");
  const reader = createPublicClient({ chain: arcTestnet, transport: arcReadTransport() });
  const recipients = [...new Set(records.filter(record => record.kind !== "invoice").map(record => record.recipient))];
  const allowedRecipients: `0x${string}`[] = [];
  for (let offset = 0; offset < recipients.length; offset += 8) {
    const batch = recipients.slice(offset, offset + 8);
    const allowed = await Promise.all(batch.map(recipient => reader.readContract({ address: vault.address as `0x${string}`, abi: treasuryVaultAbi, functionName: "recipients", args: [recipient] })));
    batch.forEach((recipient, index) => { if (allowed[index]) allowedRecipients.push(recipient); });
  }
  const spent = await reader.readContract({ address: vault.address as `0x${string}`, abi: treasuryVaultAbi, functionName: "dailySpent", args: [BigInt(Math.floor(Date.now() / 86400000))] });
  const journal = openVaultPayments();
  let reserved = 0n;
  try { reserved = journal.reserved(companyId); } finally { journal.close(); }
  const daily = parseAmount(vault.policy.dailyLimitUsdc);
  const lifetimeRemaining = parseAmount(vault.policy.lifetimeLimitUsdc) - parseAmount(vault.lifetimeSpentUsdc);
  return { companyId, records, balanceBaseUnits: parseAmount(vault.balanceUsdc).toString(), reservedBaseUnits: (reserved + parseAmount(vault.policy.liquidityFloorUsdc)).toString(), committedTodayBaseUnits: (spent + reserved).toString(), policy: {
    allowedRecipients, maxPaymentBaseUnits: parseAmount(vault.policy.paymentLimitUsdc).toString(), dailyLimitBaseUnits: (lifetimeRemaining < daily ? lifetimeRemaining + spent : daily).toString(), approvalThresholdBaseUnits: parseAmount(vault.policy.approvalThresholdUsdc).toString(), requiredApprovals: vault.policy.requiredApprovals,
  } };
}
