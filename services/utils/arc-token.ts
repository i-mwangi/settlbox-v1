import type { FaucetMetadata } from "@/types/faucet";

export async function getFaucetMetadata(_client: unknown, assetId: string): Promise<FaucetMetadata> {
  if (assetId === "native-usdc") return { symbol: "USDC", decimals: 18, maxSupply: 0 };
  if (assetId.toLowerCase() === "0x3600000000000000000000000000000000000000") return { symbol: "USDC", decimals: 6, maxSupply: 0 };
  throw new Error("Unsupported Arc settlement asset");
}
