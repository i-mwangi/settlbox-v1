import { createPublicClient, http, formatUnits } from "viem";
import { arcTestnet } from "../arc/network.ts";
import type { TreasuryConfiguration } from "./treasury-runtime";
import type { SeededWorkspace } from "../../types/seeded-workspace";
import { openBusinessRecords } from "./business-records.ts";
import { projectWorkspaceSettlement } from "./workspace-settlement.ts";
import { recordBalanceObservation } from "./balance-history.ts";
import { openPaymentLinks } from "./payment-links.ts";
import { reconcileInvoiceCollections } from "./invoice-reconciliation.ts";

let cachedBalance: { address: string; expiresAt: number; value: Promise<string> } | undefined;
export async function workspaceView(workspace: SeededWorkspace, config: TreasuryConfiguration): Promise<SeededWorkspace> {
  const connected = workspace.entityId === "entity-3";
  let amount = 0;
  let amountExact = "0";
  if (connected) {
    if (!cachedBalance || cachedBalance.address !== config.wallet.address || cachedBalance.expiresAt <= Date.now()) {
      const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
      cachedBalance = { address: config.wallet.address, expiresAt: Date.now() + 10000, value: reader.getBalance({ address: config.wallet.address }).then(balance => formatUnits(balance, 18)) };
    }
    amountExact = await cachedBalance.value;
    amount = Number(amountExact);
  }
  const accounts = workspace.data.accounts.map((account, index) => index === 0 && connected ? { ...account, accountId: config.wallet.address } : account);
  const balances = Object.fromEntries(accounts.map((account, index) => [account.accountId, [{ faucetId: "native-usdc", symbol: "USDC", amount: index === 0 ? amount : 0, decimals: 18, usdValue: index === 0 ? amount : 0 }]]));
  const repository = openBusinessRecords();
  const links = openPaymentLinks();
  try {
    const records = connected ? reconcileInvoiceCollections(config.wallet.companyId, repository, links) : [];
    const proposals = records.filter(record => record.kind !== "invoice" && record.status !== "draft" && record.status !== "cancelled").map(record => ({ id: record.id, uuid: record.id, businessRecordId: record.id, amountExact: record.amount, transactionHash: record.transactionHash, accountId: config.wallet.address, accountName: accounts[0]?.name || "Treasury", type: "SEND", status: record.status === "paid" ? "EXECUTED" : record.status === "failed" ? "FAILED" : ["processing", "submitted", "ready"].includes(record.status) ? "READY" : "PENDING", amount: Number(record.amount), currency: "USDC", to: record.counterparty, toAddress: record.recipient, label: record.title, note: record.description, createdBy: "Workspace operator", createdAt: record.createdAt, signatures: [], requiredSignatures: config.policy.requiredApprovals }));
    const data = projectWorkspaceSettlement(workspace.data, records, config.wallet.address);
    const balanceHistory = connected ? recordBalanceObservation(config.wallet.companyId, workspace.entityId, config.wallet.address, amountExact) : [];
    return { ...workspace, treasuryAddress: connected ? config.wallet.address : null, data: { ...data, accounts, balances, totalBalance: amount, pendingProposals: proposals, balanceHistory, verifiedTransactionIds: records.filter(record => record.status === "paid" && record.transactionHash).map(record => record.id) } };
  } finally { links.close(); repository.close(); }
}
