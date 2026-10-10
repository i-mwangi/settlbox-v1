"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createTransactionStore, type TransactionStore, type UITransaction } from "@/services/store/transaction";
import type { PaymentIntent, PaymentExecution, WalletReference } from "@/types/finance";

const TransactionContext = createContext<ReturnType<typeof createTransactionStore> | null>(null);

export function TransactionProviderC({ children }: { children: ReactNode }) {
  const reference = useRef<ReturnType<typeof createTransactionStore> | null>(null);
  if (!reference.current) reference.current = createTransactionStore();
  const store = reference.current;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      store.setState({ loading: true });
      try {
        const response = await fetch("/api/treasury", { signal: controller.signal });
        if (!response.ok) { store.getState().clearTransactions(); return; }
        const result = await response.json() as { wallet: WalletReference; payments: { intent: PaymentIntent; execution: PaymentExecution }[] };
        const transactions: UITransaction[] = result.payments.map(({ intent, execution }) => ({
          id: execution.transactionHash || intent.id, type: "Outgoing",
          assets: [{ assetId: "native-usdc", amount: BigInt(intent.amount.baseUnits) }],
          blockNumber: "0", sender: result.wallet.address, recipient: intent.recipient,
          status: execution.status === "confirmed" ? "isCommited" : execution.status === "failed" ? "isFailed" : "isPending",
          amount: intent.amount.baseUnits,
        }));
        await store.getState().loadTransactions(transactions);
      } catch { if (!controller.signal.aborted) store.getState().clearTransactions(); }
    }
    void load();
    return () => controller.abort();
  }, [store]);
  return <TransactionContext.Provider value={store}>{children}</TransactionContext.Provider>;
}

export function useTransactionStore<T>(selector: (store: TransactionStore) => T): T {
  const store = useContext(TransactionContext);
  if (!store) throw new Error("Transaction provider is required");
  return useStore(store, selector);
}
