import { createArcReader } from "../arc/client";
import { formatAmount } from "../arc/amount";
import type { EvmAddress } from "../../types/finance";

export async function getBalance(address: EvmAddress) {
  const balance = await createArcReader().getUsdcBalance(address);
  return [{ assetId: "native-usdc", balance: formatAmount(balance), decimals: 18, maxSupply: "0", symbol: "USDC" }];
}
