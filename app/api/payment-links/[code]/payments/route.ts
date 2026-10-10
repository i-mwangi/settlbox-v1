import { createPublicClient, decodeFunctionData, erc20Abi, http } from "viem";
import { arcTestnet } from "@/services/arc/network";
import { requireSameOrigin } from "@/services/server/operator-session";
import { openPaymentLinks, verifyLinkSettlement } from "@/services/server/payment-links";
import type { TransactionHash } from "@/types/finance";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try { requireSameOrigin(request); }
  catch { return Response.json({ error: "Request origin is not authorized" }, { status: 403 }); }
  const { code } = await context.params;
  const repository = openPaymentLinks();
  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("txid" in body) || typeof body.txid !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.txid)) throw new Error("A valid transaction hash is required");
    const link = repository.get(code);
    if (!link) return Response.json({ error: "Payment link not found" }, { status: 404 });
    const hash = body.txid as TransactionHash;
    const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0]) });
    if (await reader.getChainId() !== arcTestnet.id) throw new Error("RPC is not Arc Testnet");
    const [transaction, receipt] = await Promise.all([reader.getTransaction({ hash }), reader.getTransactionReceipt({ hash })]);
    const block = await reader.getBlock({ blockNumber: receipt.blockNumber });
    let settlement = { to: transaction.to, value: transaction.value };
    if (transaction.to?.toLowerCase() === "0x3600000000000000000000000000000000000000") {
      const transfer = decodeFunctionData({ abi: erc20Abi, data: transaction.input });
      if (transfer.functionName !== "transfer") throw new Error("Transaction is not a USDC transfer");
      settlement = { to: transfer.args[0], value: transfer.args[1] * 1000000000000n };
    }
    verifyLinkSettlement(link, settlement, receipt, block.timestamp);
    const result = repository.record(code, hash, transaction.from, link.amount);
    return Response.json({ status: "confirmed", transactionHash: hash, paymentCount: result.records.length });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Payment could not be verified" }, { status: 409 }); }
  finally { repository.close(); }
}
