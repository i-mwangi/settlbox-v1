"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BaseError, createWalletClient, custom, type EIP1193Provider } from "viem";
import type { EvmAddress } from "@/types/finance";
import { createArcReader } from "@/services/arc/client";
import { parseAmount } from "@/services/arc/amount";

interface ArcWalletContextValue {
  address: EvmAddress | null;
  balanceBaseUnits: string | null;
  chainName: string;
  isConnecting: boolean;
  connect: () => Promise<EvmAddress>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  sendUsdc: (recipient: EvmAddress, amount: string) => Promise<`0x${string}`>;
  signMessage: (message: string) => Promise<`0x${string}`>;
  sendContractTransaction: (contract: EvmAddress, data: `0x${string}`, value?: bigint) => Promise<`0x${string}`>;
}

const ArcWalletContext = createContext<ArcWalletContextValue | null>(null);

function getInjectedProvider(): EIP1193Provider {
  const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error("Install an EVM wallet to connect to Arc");
  return provider;
}

export function ArcWalletProvider({ children }: { children: ReactNode }) {
  const reader = useMemo(createArcReader, []);
  const [address, setAddress] = useState<EvmAddress | null>(null);
  const [balanceBaseUnits, setBalanceBaseUnits] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    const balance = await reader.getUsdcBalance(address);
    setBalanceBaseUnits(balance.toString());
  }, [address, reader]);

  useEffect(() => {
    if (!address) return;
    let active = true;
    reader.getUsdcBalance(address).then(balance => {
      if (active) setBalanceBaseUnits(balance.toString());
    }).catch(() => {
      if (active) setBalanceBaseUnits(null);
    });
    return () => { active = false; };
  }, [address, reader]);

  useEffect(() => {
    const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
    if (!provider) return;
    const disconnect = () => { setAddress(null); setBalanceBaseUnits(null); };
    provider.on("accountsChanged", disconnect);
    provider.on("chainChanged", disconnect);
    provider.on("disconnect", disconnect);
    return () => {
      provider.removeListener("accountsChanged", disconnect);
      provider.removeListener("chainChanged", disconnect);
      provider.removeListener("disconnect", disconnect);
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const client = createWalletClient({ chain: reader.chain, transport: custom(getInjectedProvider()) });
      const [account] = await client.requestAddresses();
      if (!account) throw new Error("No wallet account selected");
      try {
        await client.switchChain({ id: reader.chain.id });
      } catch (error) {
        const cause = error instanceof BaseError ? error.walk(item => typeof item === "object" && item !== null && "code" in item && item.code === 4902) : error;
        if (!(cause instanceof Error) || !("code" in cause) || cause.code !== 4902) throw error;
        await client.addChain({ chain: reader.chain });
        await client.switchChain({ id: reader.chain.id });
      }
      setAddress(account);
      return account;
    } finally {
      setIsConnecting(false);
    }
  }, [reader]);

  const sendUsdc = useCallback(async (recipient: EvmAddress, amount: string) => {
    if (!address) throw new Error("Connect an Arc wallet first");
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient) || /^0x0{40}$/i.test(recipient)) throw new Error("Invalid recipient address");
    const value = parseAmount(amount);
    if (value <= 0n) throw new Error("Payment amount must be positive");
    const client = createWalletClient({ chain: reader.chain, transport: custom(getInjectedProvider()) });
    const [activeAccount] = await client.getAddresses();
    if (activeAccount?.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet account changed; reconnect");
    if (await client.getChainId() !== reader.chain.id) throw new Error("Wallet network changed; reconnect");
    return client.sendTransaction({ account: address, to: recipient, value });
  }, [address, reader]);

  const disconnect = useCallback(() => { setAddress(null); setBalanceBaseUnits(null); }, []);
  const sendContractTransaction = useCallback(async (contract: EvmAddress, data: `0x${string}`, value = 0n) => {
    if (!address) throw new Error("Connect an Arc wallet first");
    if (!/^0x[0-9a-fA-F]{40}$/.test(contract) || /^0x0{40}$/i.test(contract) || value < 0n) throw new Error("Invalid contract transaction");
    const client = createWalletClient({ chain: reader.chain, transport: custom(getInjectedProvider()) });
    const [account] = await client.getAddresses();
    if (account?.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet account changed; reconnect");
    if (reader.chain.id !== 5042002 || await client.getChainId() !== reader.chain.id) throw new Error("Arc Testnet is required");
    return client.sendTransaction({ account: address, to: contract, data, value });
  }, [address, reader]);
  const signMessage = useCallback(async (message: string) => {
    if (!address) throw new Error("Connect your wallet first");
    const client = createWalletClient({ chain: reader.chain, transport: custom(getInjectedProvider()) });
    const [account] = await client.getAddresses();
    if (account?.toLowerCase() !== address.toLowerCase()) throw new Error("Wallet account changed; reconnect");
    return client.signMessage({ account: address, message });
  }, [address, reader]);
  const value = useMemo(() => ({ address, balanceBaseUnits, chainName: reader.chain.name, isConnecting, connect, disconnect, refreshBalance, sendUsdc, signMessage, sendContractTransaction }),
    [address, balanceBaseUnits, reader, isConnecting, connect, disconnect, refreshBalance, sendUsdc, signMessage, sendContractTransaction]);
  return <ArcWalletContext.Provider value={value}>{children}</ArcWalletContext.Provider>;
}

export function useArcWallet() {
  const context = useContext(ArcWalletContext);
  if (!context) throw new Error("Arc wallet provider is required");
  return context;
}
