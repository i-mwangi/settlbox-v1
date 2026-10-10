import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, decodeFunctionData, defineChain, erc20Abi, http } from "viem";
import { createCircleWalletService } from "../services/server/circle-wallets.ts";
import { SqlitePaymentRepository } from "../services/server/payment-repository.ts";
import { createPaymentService } from "../services/arc/payment-service.ts";

async function main() {
const directory = join(process.cwd(), ".data");
mkdirSync(directory, { recursive: true });
const statePath = join(directory, "circle-testnet-verification.json");
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {
  setKey: randomUUID(), sourceKey: randomUUID(), destinationKey: randomUUID(), paymentId: randomUUID(),
};
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
save();

const circle = createCircleWalletService();
if (!state.walletSetId) { state.walletSetId = await circle.createWalletSet("Settlbox Testnet Verification", state.setKey); save(); }
if (!state.source) { state.source = await circle.createTreasuryWallet(state.walletSetId, state.sourceKey); save(); }
if (!state.destination) { state.destination = await circle.createTreasuryWallet(state.walletSetId, state.destinationKey); save(); }

const chain = defineChain({ id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } }, testnet: true });
const reader = createPublicClient({ chain, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || chain.rpcUrls.default.http[0]) });
if (await reader.getChainId() !== chain.id) throw new Error("RPC is not Arc Testnet");
let sourceBalance = await reader.getBalance({ address: state.source.address });
const amount = "1000000000000000";
const gasReserve = "10000000000000000";
if (sourceBalance < BigInt(amount) + BigInt(gasReserve) && !state.faucetRequestedAt && process.argv.includes("--request-faucet")) {
  await circle.fundVerificationWallet(state.source.address);
  state.faucetRequestedAt = new Date().toISOString();
  save();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    sourceBalance = await reader.getBalance({ address: state.source.address });
    if (sourceBalance >= BigInt(amount) + BigInt(gasReserve)) break;
  }
}
if (sourceBalance < BigInt(amount) + BigInt(gasReserve)) {
  console.log(`Fund this verification wallet with test USDC, then run this script again: ${state.source.address}`);
  process.exitCode = 2;
} else {
  const database = join(directory, "circle-testnet-verification.sqlite");
  const repository = new SqlitePaymentRepository(database);
  try {
    repository.saveAccount({
      wallet: { ...state.source, companyId: "settlbox-verification" },
      balanceBaseUnits: sourceBalance.toString(), gasReserveBaseUnits: gasReserve,
      policy: { allowedRecipients: [state.destination.address], maxPaymentBaseUnits: amount, dailyLimitBaseUnits: amount, approvalThresholdBaseUnits: "100000000000000000", requiredApprovals: 1 },
    });
    if (!state.destinationBalanceBefore) { state.destinationBalanceBefore = (await reader.getBalance({ address: state.destination.address })).toString(); save(); }
    const payment = {
      id: state.paymentId, companyId: "settlbox-verification", walletId: state.source.id,
      recipient: state.destination.address, amount: { symbol: "USDC", decimals: 18, baseUnits: amount },
      purpose: "transfer", idempotencyKey: state.paymentId,
    };
    const service = createPaymentService({ repository, executor: circle });
    let execution = await service.submit(payment);
    if (execution.status === "ready") {
      execution = await circle.submit(payment);
      await repository.markSubmitted(payment.id, execution);
    }
    const providerId = execution.providerTransactionId;
    if (!providerId) throw new Error("Submission needs manual reconciliation before any retry");
    let settled;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      settled = await circle.inspect(payment.id, providerId);
      if (settled.status === "confirmed" || settled.status === "failed") break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    if (settled?.status !== "confirmed" || !settled.transactionHash) throw new Error(`Settlement pending or unsuccessful: ${settled?.status}`);
    const receipt = await reader.getTransactionReceipt({ hash: settled.transactionHash });
    const transaction = await reader.getTransaction({ hash: settled.transactionHash });
    if (receipt.status !== "success" || transaction.from.toLowerCase() !== state.source.address.toLowerCase()) throw new Error("Chain settlement does not match the treasury wallet");
    const nativeTransfer = transaction.to?.toLowerCase() === state.destination.address.toLowerCase() && transaction.value === BigInt(amount);
    let tokenTransfer = false;
    if (transaction.to?.toLowerCase() === "0x3600000000000000000000000000000000000000") {
      const decoded = decodeFunctionData({ abi: erc20Abi, data: transaction.input });
      tokenTransfer = decoded.functionName === "transfer" && decoded.args[0].toLowerCase() === state.destination.address.toLowerCase() && decoded.args[1] === BigInt(amount) / 1000000000000n;
    }
    if (!nativeTransfer && !tokenTransfer) throw new Error("Settled payment recipient or amount does not match the payment intent");
    const destinationBalance = await reader.getBalance({ address: state.destination.address });
    if (destinationBalance < BigInt(state.destinationBalanceBefore) + BigInt(amount)) throw new Error("Recipient balance has not increased by the payment amount");
    repository.recordSettlement(payment.companyId, settled);
    state.verifiedTransactionHash = settled.transactionHash;
    state.verifiedAt = new Date().toISOString();
    save();
    console.log(`Verified Circle → Arc Testnet → recipient balance: ${settled.transactionHash}`);
  } finally { repository.close(); }
}

}

main().catch(error => {
  let message = error instanceof Error ? error.message : "Testnet verification failed";
  for (const secret of [process.env.CIRCLE_API_KEY, process.env.CIRCLE_ENTITY_SECRET]) {
    if (secret) message = message.replaceAll(secret, "[redacted]");
  }
  console.error(message.slice(0, 500));
  process.exitCode = 1;
});
