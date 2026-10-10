import type { AssetWithMetadata } from "@/types/faucet";

export const getDefaultSelectedToken = (assets: AssetWithMetadata[]): AssetWithMetadata => {
  const usdc = assets.find(asset => asset.metadata?.symbol?.toUpperCase() === "USDC");
  return usdc || {
    amount: "0",
    faucetId: "0x3600000000000000000000000000000000000000",
    metadata: { symbol: "USDC", decimals: 6, maxSupply: 0 },
  };
};
