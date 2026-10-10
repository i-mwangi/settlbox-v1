"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useArcWallet } from "./ArcWalletProvider";
import type { AssetWithMetadata } from "@/types/faucet";

interface AccountContextType {
  assets: AssetWithMetadata[];
  loading: boolean;
  error: Error | null;
  isAccountDeployed: boolean;
  accountId: string;
  isError: boolean;
  refreshAccount: () => Promise<void>;
  refetchAssets: () => Promise<void>;
  forceFetch: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const wallet = useArcWallet();
  const value = useMemo<AccountContextType>(() => ({
    assets: wallet.address && wallet.balanceBaseUnits !== null ? [{ faucetId: "native-usdc", amount: wallet.balanceBaseUnits, metadata: { symbol: "USDC", decimals: 18, maxSupply: 0 } }] : [],
    loading: wallet.isConnecting, error: null, isError: false,
    isAccountDeployed: !!wallet.address, accountId: wallet.address || "",
    refreshAccount: wallet.refreshBalance, refetchAssets: wallet.refreshBalance, forceFetch: wallet.refreshBalance,
  }), [wallet]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccountContext() {
  const context = useContext(AccountContext);
  if (!context) throw new Error("Account provider is required");
  return context;
}
