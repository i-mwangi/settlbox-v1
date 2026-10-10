"use client";
import React, { createContext, useContext } from "react";
interface AccountContextType {
    assets: any[];
    loading: boolean;
    error: unknown;
    isAccountDeployed: boolean;
    accountId: string;
    isError: boolean;
    refreshAccount: () => Promise<void>;
    refetchAssets: () => Promise<void>;
    forceFetch: () => Promise<void>;
}
const AccountContext = createContext<AccountContextType | undefined>(undefined);
const ACCOUNT_VALUE: AccountContextType = {
    assets: [],
    loading: false,
    error: null,
    isAccountDeployed: true,
    accountId: "demo-account",
    isError: false,
    refreshAccount: async () => { },
    refetchAssets: async () => { },
    forceFetch: async () => { },
};
export const AccountProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    return <AccountContext.Provider value={ACCOUNT_VALUE}>{children}</AccountContext.Provider>;
};
export const useAccountContext = () => {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error("useAccountContext must be used within an AccountProvider");
    }
    return context;
};
