import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createHash } from "node:crypto";
import type { PaymentIntent, PaymentExecution, EvmAddress } from "../../types/finance";
import type { PaymentExecutor } from "../arc/payment-service";
import { formatAmount, parseBaseUnits } from "../arc/amount.ts";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

function providerKey(payment: PaymentIntent): string {
  const hex = createHash("sha256").update(`${payment.companyId}:${payment.walletId}:${payment.idempotencyKey}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function createCircleWalletService() {
  if (typeof window !== "undefined") throw new Error("Circle wallet operations require the server");
  if (process.env.NEXT_PUBLIC_ARC_ENVIRONMENT && process.env.NEXT_PUBLIC_ARC_ENVIRONMENT !== "testnet") {
    throw new Error("Company disbursements are restricted to Arc Testnet");
  }
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) throw new Error("Circle API key and registered entity secret are required");
  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  return {
    async fundVerificationWallet(address: EvmAddress) {
      await client.requestTestnetTokens({ address, blockchain: "ARC-TESTNET", usdc: true, native: true });
    },
    async createTreasuryWallet(walletSetId: string, idempotencyKey: string) {
      const response = await client.createWallets({ walletSetId, idempotencyKey, blockchains: ["ARC-TESTNET"], count: 1, accountType: "EOA" });
      const wallet = response.data?.wallets?.[0];
      if (!wallet?.id || !wallet.address || !/^0x[0-9a-fA-F]{40}$/.test(wallet.address)) throw new Error("Circle did not return a valid wallet");
      return { id: wallet.id, address: wallet.address as EvmAddress, chainId: 5042002 };
    },
    async createWalletSet(name: string, idempotencyKey: string) {
      const response = await client.createWalletSet({ name, idempotencyKey });
      const id = response.data?.walletSet?.id;
      if (!id) throw new Error("Circle did not return a wallet set");
      return id;
    },
    async submit(payment: PaymentIntent): Promise<PaymentExecution> {
      const walletResponse = await client.getWallet({ id: payment.walletId });
      const wallet = walletResponse.data?.wallet;
      if (wallet?.blockchain !== "ARC-TESTNET") throw new Error("Wallet is not on Arc Testnet");
      const response = await client.createTransaction({
        walletAddress: wallet.address,
        blockchain: "ARC-TESTNET",
        tokenAddress: USDC_ADDRESS,
        amount: [formatAmount(parseBaseUnits(payment.amount.baseUnits))],
        destinationAddress: payment.recipient,
        idempotencyKey: providerKey(payment),
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });
      const id = response.data?.id;
      if (!id) throw new Error("Circle did not return a transaction identifier");
      return { paymentId: payment.id, status: "processing", providerTransactionId: id };
    },
    async inspect(paymentId: string, providerTransactionId: string): Promise<PaymentExecution> {
      const response = await client.getTransaction({ id: providerTransactionId });
      const transaction = response.data?.transaction;
      if (!transaction || transaction.blockchain !== "ARC-TESTNET") throw new Error("Arc Testnet transaction not found");
      const transactionHash = transaction.txHash;
      const hash = transactionHash && /^0x[0-9a-fA-F]{64}$/.test(transactionHash) ? transactionHash as `0x${string}` : undefined;
      if (["FAILED", "CANCELLED", "DENIED"].includes(transaction.state)) {
        return { paymentId, providerTransactionId, status: "failed", failureReason: transaction.errorReason || transaction.state };
      }
      if (transaction.state === "COMPLETE" && hash) return { paymentId, providerTransactionId, status: "confirmed", transactionHash: hash };
      return { paymentId, providerTransactionId, status: hash ? "submitted" : "processing", transactionHash: hash };
    },
  } satisfies PaymentExecutor & Record<string, unknown>;
}
