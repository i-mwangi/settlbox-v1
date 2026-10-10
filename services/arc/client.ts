import { createPublicClient, http, isAddress } from "viem";
import type { EvmAddress, TransactionHash } from "../../types/finance";
import { getArcChain, getArcEnvironment } from "./network";

export function createArcReader() {
  const chain = getArcChain(getArcEnvironment(process.env.NEXT_PUBLIC_ARC_ENVIRONMENT));
  const client = createPublicClient({ chain, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || chain.rpcUrls.default.http[0]) });
  return {
    chain,
    async getUsdcBalance(address: EvmAddress): Promise<bigint> {
      if (!isAddress(address)) throw new Error("Invalid wallet address");
      return client.getBalance({ address });
    },
    async getReceipt(hash: TransactionHash) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error("Invalid transaction hash");
      return client.getTransactionReceipt({ hash });
    },
  };
}
