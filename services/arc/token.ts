export const ARC_USDC = {
  assetId: "native-usdc",
  erc20Address: "0x3600000000000000000000000000000000000000",
  symbol: "USDC",
  nativeDecimals: 18,
  erc20Decimals: 6,
} as const;

export function getArcTokenMetadata(assetId: string) {
  if (assetId !== ARC_USDC.assetId && assetId.toLowerCase() !== ARC_USDC.erc20Address) {
    throw new Error("Only USDC on Arc Testnet is supported");
  }
  return {
    symbol: ARC_USDC.symbol,
    decimals: assetId === ARC_USDC.assetId ? ARC_USDC.nativeDecimals : ARC_USDC.erc20Decimals,
    maxSupply: 0,
  };
}
