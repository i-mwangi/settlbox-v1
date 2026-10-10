import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { DemoTransaction } from "@/presentation/contexts/DemoProvider";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";
function truncateAddress(addr: string) {
    if (addr.length <= 10)
        return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function isRawAddress(name: string) {
    return name.startsWith("0x") || name === "multiple";
}
function DetailRow({ label, children }: {
    label: string;
    children: React.ReactNode;
}) {
    return (<div className="flex items-center py-4 px-5 border-b border-primary-divider last:border-b-0">
      <span className="text-sm text-text-secondary w-[140px] shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">{children}</div>
    </div>);
}
function CopyButton({ text }: {
    text: string;
}) {
    return (<button onClick={() => {
            navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard");
        }} className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/>
      </svg>
    </button>);
}
function AddressDetail({ name, address }: {
    name: string;
    address: string;
}) {
    const hasAnnotation = !isRawAddress(name) && name !== address;
    return (<div className="flex flex-col gap-0.5">
      {hasAnnotation && (<span className="text-sm font-medium text-text-primary">{name}</span>)}
      <div className="relative group flex items-center gap-1">
        <span className="text-xs text-text-secondary font-mono">
          {truncateAddress(address)}
        </span>
        <CopyButton text={address}/>
        
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
          <div className="bg-text-primary text-background text-xs font-mono px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            {address}
          </div>
        </div>
      </div>
    </div>);
}
interface TransactionDetailProps {
    transaction: DemoTransaction;
    onBack: () => void;
}
const TransactionDetail: React.FC<TransactionDetailProps> = ({ transaction, onBack }) => {
    const isIncome = transaction.type === "RECEIVE";
    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };
    return (<div className="bg-background border border-primary-divider rounded-2xl w-full">
      
      <div className="flex items-center gap-3 px-5 py-4 border-b border-primary-divider">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg border border-primary-divider hover:bg-app-background transition-colors cursor-pointer">
          <svg className="w-4 h-4 text-text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-text-primary">Transaction Detail</h2>
      </div>

      
      <div className="w-full">
        <DetailRow label="Transaction Hash">
          <span className="text-sm text-text-primary font-mono truncate">{transaction.txHash}</span>
          <CopyButton text={transaction.txHash}/>
        </DetailRow>

        <DetailRow label="Status">
          <Badge status={transaction.status === "COMPLETED" ? BadgeStatus.SUCCESS : BadgeStatus.AWAITING} text={transaction.status === "COMPLETED" ? "Completed" : "Pending"}/>
        </DetailRow>

        <DetailRow label="Type">
          <span className={`text-sm font-medium ${isIncome ? "text-badge-success-text" : "text-badge-fail-text"}`}>
            {transaction.type}
          </span>
        </DetailRow>

        <DetailRow label="Category">
          <Badge status={BadgeStatus.NEUTRAL} text={transaction.category}/>
        </DetailRow>

        <DetailRow label="Date">
          <span className="text-sm text-text-primary">{formatDate(transaction.timestamp)}</span>
        </DetailRow>

        <DetailRow label="From">
          <AddressDetail name={transaction.from} address={transaction.fromAddress}/>
        </DetailRow>

        <DetailRow label="To">
          <AddressDetail name={transaction.to} address={transaction.toAddress}/>
        </DetailRow>

        <DetailRow label="Amount">
          <div className="flex items-center gap-2">
            <img src="/token/usdc.svg" alt="usdc" className="w-5 h-5"/>
            <span className={`text-sm font-semibold ${isIncome ? "text-badge-success-text" : "text-badge-fail-text"}`}>
              {isIncome ? "+" : "-"}${transaction.amount.toLocaleString("en-US")} {transaction.currency}
            </span>
          </div>
        </DetailRow>

        <DetailRow label="Label">
          <span className="text-sm text-text-primary">{transaction.label}</span>
        </DetailRow>

        {transaction.note && (<DetailRow label="Note">
            <span className="text-sm text-text-secondary">{transaction.note}</span>
          </DetailRow>)}
      </div>
    </div>);
};
export default TransactionDetail;
