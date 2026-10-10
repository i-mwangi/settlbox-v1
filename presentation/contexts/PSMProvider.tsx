"use client";
export { MockPSMProvider as PSMProvider, usePSMProvider } from "./DemoMockProviders";
export interface EnrichedBalance {
    faucetId: string;
    faucetBech32: string;
    amount: bigint;
    symbol: string;
    decimals: number;
}
export interface AccountCache {
    syncResult: any;
    enrichedBalances: EnrichedBalance[];
}
