"use client";
import { useArcWallet } from "@/contexts/ArcWalletProvider";
export const getLastConnectedAddress = (): string | null => null;
export const getWalletAddresses = (): string[] => [];
async function unsupportedWalletOperation(): Promise<never> {
  throw new Error("Manage wallet creation, import, and backup in your EVM wallet application");
}
export function useWalletConnect() {
  const wallet = useArcWallet();
  return {
    walletAddress: wallet.address ?? "",
    isConnected: wallet.address !== null,
    isLoading: wallet.isConnecting,
    connect: wallet.connect,
    handleConnectExisting: async (..._args: unknown[]) => wallet.connect(),
    handleCreateWallet: unsupportedWalletOperation,
    handleImportWallet: async (..._args: unknown[]): Promise<string[]> => unsupportedWalletOperation(),
    disconnect: async () => wallet.disconnect(),
    deployAccount: unsupportedWalletOperation,
    importAccount: unsupportedWalletOperation,
    replaceWalletAddresses: unsupportedWalletOperation,
    addWalletAddress: unsupportedWalletOperation,
  };
}
