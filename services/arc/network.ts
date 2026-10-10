import { defineChain } from "viem";
import type { ArcEnvironment } from "../../types/finance";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.io" } },
  testnet: true,
});

export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.arc.io" } },
});

export function getArcChain(environment: ArcEnvironment) {
  return environment === "mainnet" ? arcMainnet : arcTestnet;
}

export function getArcEnvironment(value: string | undefined): ArcEnvironment {
  if (value === undefined || value === "testnet") return "testnet";
  if (value === "mainnet") return "mainnet";
  throw new Error("Unsupported Arc environment");
}
