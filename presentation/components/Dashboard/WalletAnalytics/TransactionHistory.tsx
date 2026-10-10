"use client";
import React, { useState, useMemo } from "react";
import { useDemo, DemoTransaction } from "@/presentation/contexts/DemoProvider";
import { Table, CellContent } from "@/presentation/components/Common/Table";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
function truncateAddress(addr: string) {
    if (addr.length <= 10)
        return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function isRawAddress(name: string) {
    return name.startsWith("0x") || name === "multiple";
}
function AddressCell({ name, address }: {
    name: string;
    address: string;
}) {
    const hasAnnotation = !isRawAddress(name) && name !== address;
    return (<div className="relative group flex flex-col items-center gap-0.5">
      {hasAnnotation && (<span className="text-sm text-text-primary font-medium">{name}</span>)}
      <span className="text-xs text-text-secondary font-mono">
        {truncateAddress(address)}
      </span>
      
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-text-primary text-background text-xs font-mono px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          {address}
        </div>
      </div>
    </div>);
}
const TransactionHistory = ({ onTransactionClick, }: {
    onTransactionClick: (transaction: DemoTransaction) => void;
}) => {
    const { data } = useDemo();
    const transactions = data?.transactions ?? [];
    const [searchQuery, setSearchQuery] = useState("");
    const filteredTransactions = useMemo(() => {
        if (!searchQuery.trim())
            return transactions;
        const q = searchQuery.toLowerCase();
        return transactions.filter(tx => tx.txHash.toLowerCase().includes(q) ||
            tx.from.toLowerCase().includes(q) ||
            tx.to.toLowerCase().includes(q) ||
            tx.label.toLowerCase().includes(q) ||
            tx.category.toLowerCase().includes(q));
    }, [transactions, searchQuery]);
    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };
    const formatCurrency = (amount: number) => `$${amount.toLocaleString("en-US")}`;
    const tableHeaders = ["Date", "Type", "Category", "From", "To", "Amount", "Status"];
    const tableData: Record<string, CellContent>[] = useMemo(() => {
        return filteredTransactions.map(tx => {
            const isIncome = tx.type === "RECEIVE";
            return {
                Date: (<span className="text-text-secondary text-sm">
            {formatDate(tx.timestamp)}
          </span>),
                Type: (<span className={`text-sm font-medium ${isIncome ? "text-badge-success-text" : "text-badge-fail-text"}`}>
            {tx.type}
          </span>),
                Category: <Badge status={BadgeStatus.NEUTRAL} text={tx.category}/>,
                From: <AddressCell name={tx.from} address={tx.fromAddress}/>,
                To: <AddressCell name={tx.to} address={tx.toAddress}/>,
                Amount: (<div className="flex items-center justify-center gap-1.5">
            <img src="/token/usdc.svg" alt="usdc" className="w-4 h-4"/>
            <span className={`num text-sm font-medium ${isIncome ? "text-badge-success-text" : "text-badge-fail-text"}`}>
              {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
            </span>
          </div>),
                Status: (<Badge status={tx.status === "COMPLETED" ? BadgeStatus.SUCCESS : BadgeStatus.AWAITING} text={tx.status === "COMPLETED" ? "Completed" : "Pending"}/>),
            };
        });
    }, [filteredTransactions]);
    return (<div className="flex flex-col gap-4 w-full">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Transaction History</h2>
          <p className="text-sm text-text-secondary mt-1">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          
          <div className="flex items-center gap-2 bg-background border border-primary-divider rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
            </svg>
            <input type="text" placeholder="Search transactions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="text-sm text-text-primary bg-transparent border-none outline-none w-[200px] placeholder:text-text-secondary"/>
          </div>
          <SecondaryButton text="Export CSV" variant="light" onClick={() => { }} buttonClassName="w-auto"/>
        </div>
      </div>

      
      <Table headers={tableHeaders} data={tableData} noDataMessage="No transactions found" onRowClick={(_rowData, index) => {
            const tx = filteredTransactions[index];
            if (tx)
                onTransactionClick(tx);
        }}/>
    </div>);
};
export default TransactionHistory;
