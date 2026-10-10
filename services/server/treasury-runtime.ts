import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createPublicClient, http, decodeFunctionData, erc20Abi } from "viem";
import { arcTestnet } from "../arc/network.ts";
import { createPaymentService } from "../arc/payment-service.ts";
import { createCircleWalletService } from "./circle-wallets.ts";
import { SqlitePaymentRepository, type TreasuryAccount } from "./payment-repository.ts";
import type { PaymentExecution, PaymentIntent } from "../../types/finance";

export interface TreasuryConfiguration extends Omit<TreasuryAccount, "balanceBaseUnits"> {}

export function readTreasuryConfiguration(): TreasuryConfiguration {
  if (process.env.NEXT_PUBLIC_ARC_ENVIRONMENT && process.env.NEXT_PUBLIC_ARC_ENVIRONMENT !== "testnet") throw new Error("Arc Testnet is required");
  const config = JSON.parse(readFileSync(resolve(process.env.SETTLBOX_TREASURY_CONFIG || ".data/treasury-config.json"), "utf8")) as TreasuryConfiguration;
  if (config.wallet.chainId !== arcTestnet.id) throw new Error("Arc Testnet wallet is required");
  return config;
}

export async function openTreasury() {
  if (process.env.NEXT_PUBLIC_ARC_ENVIRONMENT && process.env.NEXT_PUBLIC_ARC_ENVIRONMENT !== "testnet") throw new Error("Arc Testnet is required");
  const config = readTreasuryConfiguration();
  if (config.wallet.chainId !== arcTestnet.id) throw new Error("Arc Testnet wallet is required");
  const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
  if (await reader.getChainId() !== arcTestnet.id) throw new Error("RPC is not Arc Testnet");
  const balance = await reader.getBalance({ address: config.wallet.address });
  const path = resolve(process.env.SETTLBOX_TREASURY_DATABASE || ".data/treasury.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  const repository = new SqlitePaymentRepository(path);
  const circle = createCircleWalletService();
  repository.saveAccount({ ...config, balanceBaseUnits: balance.toString() });
  const payments = createPaymentService({ repository, executor: circle });

  return {
    config, balance: balance.toString(), repository, payments,
    async reconcile(intent: PaymentIntent, execution: PaymentExecution) {
      if (!execution.providerTransactionId || ["confirmed", "failed"].includes(execution.status)) return execution;
      const latest = await circle.inspect(intent.id, execution.providerTransactionId);
      if (latest.status === "confirmed" && latest.transactionHash) {
        const [receipt, transaction] = await Promise.all([
          reader.getTransactionReceipt({ hash: latest.transactionHash }), reader.getTransaction({ hash: latest.transactionHash }),
        ]);
        if (receipt.status !== "success" || transaction.from.toLowerCase() !== config.wallet.address.toLowerCase()) throw new Error("Settlement source mismatch");
        const amount = BigInt(intent.amount.baseUnits);
        let verified = transaction.to?.toLowerCase() === intent.recipient.toLowerCase() && transaction.value === amount;
        if (transaction.to?.toLowerCase() === "0x3600000000000000000000000000000000000000") {
          const transfer = decodeFunctionData({ abi: erc20Abi, data: transaction.input });
          verified = transfer.functionName === "transfer" && transfer.args[0].toLowerCase() === intent.recipient.toLowerCase() && transfer.args[1] * 1000000000000n === amount;
        }
        if (!verified) throw new Error("Settlement recipient or amount mismatch");
      }
      if (["confirmed", "failed"].includes(latest.status)) repository.recordSettlement(config.wallet.companyId, latest);
      return latest;
    },
    close: () => repository.close(),
  };
}
