import { resolve } from "node:path";
import { createPublicClient, http, decodeEventLog, type Hex } from "viem";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { arcTestnet } from "../arc/network";
import { treasuryVaultAbi } from "../arc/treasury-vault";
import { parseAmount } from "../arc/amount";
import { readTreasuryVaultStatus } from "./treasury-vault";
import { verifiedAgentExecutor } from "./agent-executor";
import { openBusinessRecords } from "./business-records";
import { openAgentRuns } from "./agent-runs";
import { VaultPaymentJournal, vaultPaymentId, vaultProviderKey, type VaultPayment } from "./vault-payment-journal";

export function openVaultPayments() { return new VaultPaymentJournal(resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite")); }
export async function vaultPaymentContext(companyId: string) {
  const vault = await readTreasuryVaultStatus(companyId);
  if (vault.state !== "verified") throw new Error("A verified vault is required");
  const executor = await verifiedAgentExecutor(companyId);
  if (executor.address.toLowerCase() !== vault.executor.toLowerCase()) throw new Error("Assign and verify the Circle executor first");
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
  return { vault, executor, reader };
}
function matches(payment: VaultPayment, observed: readonly [string,bigint,bigint,bigint,number,number]) {
  if (observed[0].toLowerCase() !== payment.recipient.toLowerCase() || observed[1] !== parseAmount(payment.amount) || observed[2].toString() !== payment.expiresAt) throw new Error("On-chain payment terms differ from the saved obligation");
}
export async function queueVaultPayment(companyId: string, principal: string, runId: string, recordId: string) {
  const context = await vaultPaymentContext(companyId);
  const journal = openVaultPayments(); const records = openBusinessRecords(); const runs = openAgentRuns();
  try {
    const existing = journal.get(companyId, recordId);
    let payment = existing;
    if (!payment) {
      const run = runs.list(companyId).find(run => run.id === runId);
      if (run?.fundingSource !== "treasury_vault") throw new Error("Prepare a fresh vault-funded plan before queueing");
      const action = run?.actions.find(action => action.recordId === recordId && action.tool === "review_payment" && action.disposition === "review");
      const record = records.get(companyId, recordId);
      if (!action || !record || record.amount !== action.amountUsdc || record.kind !== action.kind || record.dueDate !== action.dueDate) throw new Error("Prepare an eligible plan for this saved obligation first");
      if (context.vault.paused) throw new Error("The vault is paused");
      const amount = parseAmount(record.amount);
      if (amount <= 0n || amount > parseAmount(context.vault.policy.paymentLimitUsdc)) throw new Error("Payment exceeds the vault limit");
      const allowed = await context.reader.readContract({ address: context.vault.address as Hex, abi: treasuryVaultAbi, functionName: "recipients", args: [record.recipient] });
      if (!allowed) throw new Error("Recipient is not allowed by the vault");
      if (parseAmount(context.vault.balanceUsdc) < amount + parseAmount(context.vault.policy.liquidityFloorUsdc)) throw new Error("Fund the vault without consuming its liquidity floor before queueing");
      payment = journal.reserve({ id: vaultPaymentId(companyId, context.vault.address, recordId), companyId, recordId, runId, recipient: record.recipient, amount: record.amount, expiresAt: String(Math.floor(Date.now()/1000) + 86400), createdAt: new Date().toISOString(), requestedBy: principal, status: "queue_pending" }, parseAmount(context.vault.balanceUsdc) - parseAmount(context.vault.policy.liquidityFloorUsdc) - parseAmount(run!.request.reserveUsdc));
    }
    if (payment.queueProviderId) return payment;
    if (context.vault.paused) throw new Error("The vault is paused; the saved request can be retried after activation");
    const client = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET! });
    const response = await client.createContractExecutionTransaction({ walletId: context.executor.walletId, contractAddress: context.vault.address, abiFunctionSignature: "queuePayment(bytes32,address,uint256,uint64)", abiParameters: [payment.id, payment.recipient, parseAmount(payment.amount).toString(), payment.expiresAt], idempotencyKey: vaultProviderKey(payment.id, "queue"), fee: { type: "level", config: { feeLevel: "MEDIUM" } } });
    if (!response.data?.id) throw new Error("Circle submission is unresolved; retry the same obligation");
    return journal.patch(payment, { queueProviderId: response.data.id }, "Circle queue request accepted; awaiting chain confirmation");
  } finally { journal.close(); records.close(); runs.close(); }
}

export async function reconcileVaultPayment(companyId: string, recordId: string) {
  const { vault, reader, executor } = await vaultPaymentContext(companyId);
  const journal = openVaultPayments();
  try {
    let payment = journal.get(companyId, recordId);
    if (!payment) throw new Error("Vault payment not found");
    if (payment.status === "paid" && payment.transactionHash) return payment;
    const observed = await reader.readContract({ address: vault.address as Hex, abi: treasuryVaultAbi, functionName: "payments", args: [payment.id] });
    if (observed[5] !== 0) matches(payment, observed);
    let status = observed[5] === 3 ? "cancelled" : observed[5] === 2 ? "settlement_verification" : observed[5] === 0 ? "queue_pending" : observed[2] <= BigInt(Math.floor(Date.now()/1000)) ? "expired" : observed[3].toString() !== vault.policyVersion ? "policy_changed" : observed[4] >= vault.policy.requiredApprovals || parseAmount(payment.amount) <= parseAmount(vault.policy.approvalThresholdUsdc) ? "ready" : "awaiting_approval";
    if (observed[5] === 1 && payment.executeProviderId && status === "ready") status = "execution_pending";
    const pendingProviderId = observed[5] === 0 ? payment.queueProviderId : observed[5] === 1 ? payment.executeProviderId : undefined;
    if (pendingProviderId) {
      const client = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET! });
      const transaction = (await client.getTransaction({ id: pendingProviderId })).data?.transaction;
      if (transaction && ["FAILED", "CANCELLED", "DENIED"].includes(transaction.state)) status = observed[5] === 0 ? "queue_failed_review_required" : "execution_failed_review_required";
    }
    if (observed[5] === 2) {
      if (!payment.executeProviderId) throw new Error("Execution is on-chain but its provider record needs investigation");
      const client = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET! });
      const transaction = (await client.getTransaction({ id: payment.executeProviderId })).data?.transaction;
      if (transaction?.txHash) {
        const hash = transaction.txHash as Hex;
        const [receipt, tx] = await Promise.all([reader.getTransactionReceipt({ hash }), reader.getTransaction({ hash })]);
        if (receipt.status !== "success" || tx.from.toLowerCase() !== executor.address.toLowerCase() || tx.to?.toLowerCase() !== vault.address.toLowerCase() || tx.value !== 0n) throw new Error("Execution transaction identity mismatch");
        const verified = receipt.logs.some(log => {
          if (log.address.toLowerCase() !== vault.address.toLowerCase()) return false;
          try { const event = decodeEventLog({ abi: treasuryVaultAbi, data: log.data, topics: log.topics }); return event.eventName === "PaymentExecuted" && event.args.id === payment!.id && event.args.recipient.toLowerCase() === payment!.recipient.toLowerCase() && event.args.amount === parseAmount(payment!.amount); } catch { return false; }
        });
        if (!verified) throw new Error("Payment execution event could not be verified");
        payment = journal.patch(payment, { transactionHash: hash }, `Arc settlement verified: ${hash}`);
        const records = openBusinessRecords();
        try { records.transition(companyId, recordId, "paid", ["awaiting_approval", "paid"], { transactionHash: hash }); } finally { records.close(); }
        status = "paid";
      }
    }
    return payment.status === status ? payment : journal.patch(payment, { status }, `Observed vault payment status: ${status}`);
  } finally { journal.close(); }
}

export async function executeVaultPayment(companyId: string, recordId: string) {
  let payment = await reconcileVaultPayment(companyId, recordId);
  if (payment.executeProviderId || payment.status === "paid") return payment;
  if (payment.status !== "ready") throw new Error("Payment requires valid on-chain approvals before execution");
  const { vault, executor } = await vaultPaymentContext(companyId);
  if (vault.paused) throw new Error("Vault is paused");
  if (parseAmount(vault.balanceUsdc) < parseAmount(payment.amount) + parseAmount(vault.policy.liquidityFloorUsdc)) throw new Error("Insufficient vault liquidity");
  const client = initiateDeveloperControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY!, entitySecret: process.env.CIRCLE_ENTITY_SECRET! });
  const response = await client.createContractExecutionTransaction({ walletId: executor.walletId, contractAddress: vault.address, abiFunctionSignature: "executePayment(bytes32)", abiParameters: [payment.id], idempotencyKey: vaultProviderKey(payment.id, "execute"), fee: { type: "level", config: { feeLevel: "MEDIUM" } } });
  if (!response.data?.id) throw new Error("Circle execution is unresolved; retry this same payment");
  const journal = openVaultPayments();
  try { return journal.patch(payment, { executeProviderId: response.data.id, status: "execution_pending" }, "Circle execution submitted; awaiting verified settlement"); } finally { journal.close(); }
}
