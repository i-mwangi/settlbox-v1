"use client";
import { USDC_TOKEN_ADDRESS as FAUCET_ID } from "../utils/constant";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
export interface UITransaction {
    id: string;
    type: "Incoming" | "Outgoing" | "Faucet";
    assets: {
        assetId: string;
        amount: bigint;
    }[];
    blockNumber: string;
    sender: string;
    recipient: string;
    status: "isCommited" | "isPending" | "isFailed";
    amount: string;
}
export interface TransactionStore {
    loading: boolean;
    transactions: UITransaction[];
    loadTransactions: (record: {
        tr: any;
        inputNote: any | undefined;
    }[]) => Promise<void>;
    clearTransactions: () => void;
}
async function transactionRecordToUITransaction({ tr, inputNote, }: {
    tr: any;
    inputNote: any | undefined;
}): Promise<UITransaction> {
    throw new Error("This action is unavailable in the demo workspace.");
}
export const createTransactionStore = () => create<TransactionStore, [
    [
        "zustand/immer",
        never
    ]
]>(immer(set => ({
    loading: false,
    transactions: [],
    loadTransactions: async (record) => {
        set({ loading: true });
        try {
            const transactions: UITransaction[] = await Promise.all(record.map(record => transactionRecordToUITransaction(record)));
            transactions.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
            set({ transactions });
        }
        catch (error) {
            console.error("Error loading transactions:", error);
        }
        finally {
            set({ loading: false });
        }
    },
    clearTransactions: () => {
        set({ transactions: [], loading: false });
    },
})));
