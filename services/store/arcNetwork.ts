"use client";

import { create } from "zustand";
import { createPublicClient, http, type PublicClient } from "viem";
import { arcTestnet } from "@/services/arc/network";

export interface ArcNetworkConfig { endpoint?: string }
export interface ArcNetworkStore {
  isLoading: boolean;
  error: string | null;
  blockNum: number | null;
  config: ArcNetworkConfig;
  account: string;
  client: PublicClient | null;
  initializeSdk: (config: ArcNetworkConfig) => Promise<void>;
  syncState: (client: PublicClient) => Promise<void>;
}
export const createArcNetworkStore = () => create<ArcNetworkStore>((set, get) => ({
  isLoading: false, error: null, blockNum: null, config: {}, account: "", client: null,
  initializeSdk: async config => {
    set({ isLoading: true, error: null, config });
    try {
      const client = createPublicClient({ chain: arcTestnet, transport: http(config.endpoint || arcTestnet.rpcUrls.default.http[0]) });
      if (await client.getChainId() !== arcTestnet.id) throw new Error("RPC is not Arc Testnet");
      set({ client });
      await get().syncState(client);
    } catch (error) { set({ error: error instanceof Error ? error.message : "Arc connection failed" }); }
    finally { set({ isLoading: false }); }
  },
  syncState: async client => { try { const block = await client.getBlockNumber(); if (block > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Block number exceeds supported range"); set({ blockNum: Number(block), error: null }); } catch (error) { set({ error: error instanceof Error ? error.message : "Arc synchronization failed" }); } },
}));
