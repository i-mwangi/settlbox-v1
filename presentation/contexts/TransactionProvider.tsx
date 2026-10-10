"use client";
import { parseUnits } from "viem";
import { type ReactNode, createContext } from "react";
import { useDemo } from "./DemoProvider";
import type { TransactionStore, UITransaction } from "@/presentation/services/store/transaction";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
export const ArcNetworkStoreContext = createContext<TransactionStore | undefined>(undefined);
export const TransactionProviderC = ({ children }: {
    children: ReactNode;
}) => <>{children}</>;
export function useTransactionStore<T>(selector: (store: TransactionStore) => T): T {
    const { data } = useDemo();
    const transactions: UITransaction[] = (data?.transactions || []).map(transaction => ({ id: transaction.id, type: transaction.type === "Incoming" ? "Incoming" : "Outgoing", assets: [{ assetId: USDC_TOKEN_ADDRESS, amount: parseUnits(String(transaction.amount), 18) }], blockNumber: "0", sender: transaction.fromAddress, recipient: transaction.toAddress, status: "isCommited", amount: String(transaction.amount) }));
    return selector({ transactions, loading: false, loadTransactions: async () => { }, clearTransactions: () => { } });
}
