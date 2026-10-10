"use client";

import { create } from "zustand";

export interface UITransaction {
  id: string;
  type: "Incoming" | "Outgoing" | "Faucet";
  assets: { assetId: string; amount: bigint }[];
  blockNumber: string;
  sender: string;
  recipient: string;
  status: "isCommited" | "isPending" | "isFailed";
  amount: string;
}

export interface TransactionStore {
  loading: boolean;
  transactions: UITransaction[];
  loadTransactions: (transactions: UITransaction[]) => Promise<void>;
  clearTransactions: () => void;
}

export const createTransactionStore = () => create<TransactionStore>(set => ({
  loading: false,
  transactions: [],
  loadTransactions: async transactions => { set({ transactions, loading: false }); },
  clearTransactions: () => { set({ transactions: [], loading: false }); },
}));
