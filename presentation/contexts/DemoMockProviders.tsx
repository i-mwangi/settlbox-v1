"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useDemo } from "./DemoProvider";
interface MockAuthContextValue {
    isAuthenticated: boolean;
    user: any;
    isLoading: boolean;
    error: string | null;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    clearError: () => void;
}
const MockAuthContext = createContext<MockAuthContextValue | undefined>(undefined);
export function MockAuthProvider({ children }: {
    children: ReactNode;
}) {
    const { data, isLoggedIn, isOnboarded } = useDemo();
    const value: MockAuthContextValue = React.useMemo(() => ({
        isAuthenticated: isLoggedIn && isOnboarded,
        user: data?.user ?? null,
        isLoading: false,
        error: null,
        logout: async () => { await fetch("/api/operator/session", { method: "DELETE" }); window.location.assign("/login"); },
        refreshUser: async () => { },
        clearError: () => { },
    }), [data, isLoggedIn, isOnboarded]);
    return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}
export function useAuth(): MockAuthContextValue {
    const context = useContext(MockAuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within MockAuthProvider");
    }
    return context;
}
interface MockPSMContextType {
    multisigClient: any;
    psmCommitment: string;
    psmPublicKey: string | undefined;
    psmStatus: "connected";
    error: string | null;
    syncWarning: string | null;
    reconnect: () => Promise<void>;
    ensureConnected: () => Promise<any>;
    registerMultisig: (accountId: string, multisig: any, syncResult?: any) => void;
    getMultisig: (accountId: string) => any;
    pauseSync: () => void;
    resumeSync: () => void;
    sync: () => Promise<void>;
    accountCacheMap: Map<string, import("./PSMProvider").AccountCache>;
}
const MockPSMContext = createContext<MockPSMContextType | undefined>(undefined);
const MOCK_PSM_VALUE: MockPSMContextType = {
    multisigClient: {},
    psmCommitment: "demo-commitment",
    psmPublicKey: "demo-public-key",
    psmStatus: "connected",
    error: null,
    syncWarning: null,
    reconnect: async () => { },
    ensureConnected: async () => ({}),
    registerMultisig: () => { },
    getMultisig: () => undefined,
    pauseSync: () => { },
    resumeSync: () => { },
    sync: async () => { },
    accountCacheMap: new Map(),
};
export function MockPSMProvider({ children }: {
    children: ReactNode;
}) {
    return <MockPSMContext.Provider value={MOCK_PSM_VALUE}>{children}</MockPSMContext.Provider>;
}
export function usePSMProvider(): MockPSMContextType {
    const context = useContext(MockPSMContext);
    if (context === undefined) {
        throw new Error("usePSMProvider must be used within MockPSMProvider");
    }
    return context;
}
const MockSocketContext = createContext<{
    socket: {
        on: (event: string, callback: (...args: never[]) => void) => void;
        off: (event: string, callback: (...args: never[]) => void) => void;
    } | null;
    changeSocketUrl: (url: string) => void;
} | null>({
    socket: null,
    changeSocketUrl: () => { },
});
const MOCK_SOCKET_VALUE = { socket: null as null, changeSocketUrl: () => { } };
export function MockSocketProvider({ children }: {
    children: ReactNode;
}) {
    return <MockSocketContext.Provider value={MOCK_SOCKET_VALUE}>{children}</MockSocketContext.Provider>;
}
export function useSocket() {
    return useContext(MockSocketContext);
}
interface MockAccountContextType {
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
const MockAccountContext = createContext<MockAccountContextType | undefined>(undefined);
const MOCK_ACCOUNT_VALUE: MockAccountContextType = {
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
export function MockAccountProvider({ children }: {
    children: ReactNode;
}) {
    return <MockAccountContext.Provider value={MOCK_ACCOUNT_VALUE}>{children}</MockAccountContext.Provider>;
}
export function useAccountContext(): MockAccountContextType {
    const context = useContext(MockAccountContext);
    if (context === undefined) {
        throw new Error("useAccountContext must be used within MockAccountProvider");
    }
    return context;
}
const MockTransactionContext = createContext<any>(null);
const MOCK_TRANSACTION_VALUE = {};
export function MockTransactionProvider({ children }: {
    children: ReactNode;
}) {
    return <MockTransactionContext.Provider value={MOCK_TRANSACTION_VALUE}>{children}</MockTransactionContext.Provider>;
}
