"use client";

import { useMemo, type ReactNode } from "react";
import { formatUnits } from "viem";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
import { createArcReader } from "@/services/arc/client";

export function ArcPaymentProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useArcPayment() {
  const wallet = useArcWallet();
  const client = useMemo(createArcReader, []);
  const balances = useMemo(() => ({
    balances: wallet.address && wallet.balanceBaseUnits !== null
      ? [{ assetId: "native-usdc", balance: wallet.balanceBaseUnits, symbol: "USDC", decimals: 18, maxSupply: 0 }]
      : [],
    totalUsd: wallet.balanceBaseUnits === null ? 0 : Number(formatUnits(BigInt(wallet.balanceBaseUnits), 18)),
  }), [wallet.address, wallet.balanceBaseUnits]);
  return {
    isConnected: wallet.address !== null,
    isLoading: wallet.isConnecting,
    wallet: wallet.address ? { id: wallet.address } : null,
    address: wallet.address ?? undefined,
    client,
    balances,
    balancesLoading: wallet.address !== null && wallet.balanceBaseUnits === null,
    openModal: (_config?: unknown) => wallet.connect(),
    logoutAsync: async () => wallet.disconnect(),
    fetchBalances: wallet.refreshBalance,
  };
}
