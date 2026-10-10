import type { EvmAddress, TransactionHash } from "./finance";

export interface GiftEscrowConfiguration { chainId: 5042002; address: EvmAddress; runtimeHash: TransactionHash; }
export interface ArcGift {
  id: TransactionHash;
  sender: EvmAddress;
  recipient: EvmAddress;
  amount: string;
  expiresAt: number;
  status: "active" | "expired" | "claimed" | "refunded";
  transactionHash?: TransactionHash;
}
