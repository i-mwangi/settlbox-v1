"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createArcNetworkStore, type ArcNetworkStore } from "@/services/store/arcNetwork";
export type ArcNetworkStoreApi = ReturnType<typeof createArcNetworkStore>;
export const ArcNetworkStoreContext = createContext<ArcNetworkStoreApi | null>(null);
export function ArcNetworkProvider({ children }: { children: ReactNode }) {
  const store = useRef<ArcNetworkStoreApi | null>(null);
  store.current ||= createArcNetworkStore();
  useEffect(() => {
    const network = store.current!;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const state = network.getState();
      if (state.client) await state.syncState(state.client);
      else await state.initializeSdk({ endpoint: process.env.NEXT_PUBLIC_ARC_RPC_URL });
      if (active) timer = setTimeout(poll, tickInterval);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  return <ArcNetworkStoreContext.Provider value={store.current}>{children}</ArcNetworkStoreContext.Provider>;
}
export function useArcNetworkStore<T>(selector: (store: ArcNetworkStore) => T) { const store = useContext(ArcNetworkStoreContext); if (!store) throw new Error("Arc network provider is required"); return useStore(store, selector); }
export const tickInterval = 30000;
export function useInitAndPollSyncState() {
  const store = useContext(ArcNetworkStoreContext);
  useEffect(() => { if (!store) return; void store.getState().initializeSdk({ endpoint: process.env.NEXT_PUBLIC_ARC_RPC_URL }); const interval = setInterval(() => { const client = store.getState().client; if (client) void store.getState().syncState(client); }, tickInterval); return () => clearInterval(interval); }, [store]);
}
