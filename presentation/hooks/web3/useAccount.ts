"use client";
export function useAccount() {
    return {
        assets: [],
        refetchAssets: async () => { },
        loading: false,
        error: null,
        isAccountDeployed: true,
        accountId: "demo-account",
        isError: false,
        forceFetch: async () => { },
    };
}
