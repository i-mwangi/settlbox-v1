"use client";

import { useArcWallet } from "@/contexts/ArcWalletProvider";

export function useWalletConnect() {
  const wallet = useArcWallet();
  return { walletAddress: wallet.address || "", isConnected: !!wallet.address, isLoading: wallet.isConnecting, connect: wallet.connect, disconnect: wallet.disconnect };
}
