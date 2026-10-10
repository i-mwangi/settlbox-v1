"use client";
import { getArcTokenMetadata } from "@/services/arc/token";
export async function getFaucetMetadata(_client: unknown, assetId: string) {
  return getArcTokenMetadata(assetId);
}
export async function deployFaucet(_symbol: string, _decimals: number, _maxSupply: number, _client?: unknown): Promise<never> {
  throw new Error("USDC issuance is managed by Circle");
}
