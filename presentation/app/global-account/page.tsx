"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import type { VirtualAccount } from "@/types/provider-history";
import { useProviderHistory } from "@/presentation/services/api/provider-history";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import BaseModal from "@/presentation/components/Modal/BaseModal";
import { ModalHeader } from "@/presentation/components/Common/ModalHeader";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight, Copy, Check } from "iconoir-react";
const CARD_BG_STYLE = {
    backgroundImage: "url(/card/background.svg)",
    backgroundSize: "30%",
    backgroundPosition: "right",
    backgroundRepeat: "no-repeat",
} as const;
function fmtCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = { USD: "$", EUR: "\u20AC", AED: "AED " };
    const prefix = symbols[currency] ?? "";
    return `${prefix}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function copyToClipboard(_text: string, _label: string) {
    toast.error("Historical account details cannot be used to receive funds");
}
const CARD_GRADIENT: Record<string, string> = {
    USD: "linear-gradient(135deg, #1b3a8f 0%, #2f6df6 100%)",
    EUR: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
    AED: "linear-gradient(135deg, #064e3b 0%, #0c9f6e 100%)",
};
function primaryNumber(account: VirtualAccount): string {
    const d = account.details.find((x) => /account number|iban/i.test(x.label));
    return d?.value ?? account.details[1]?.value ?? "";
}
function CardFace({ account, className = "" }: {
    account: VirtualAccount;
    className?: string;
}) {
    const holder = account.details.find((d) => /holder/i.test(d.label))?.value ?? "Settlbox Inc.";
    return (<div className={`relative flex h-[210px] w-[340px] flex-col justify-between overflow-hidden rounded-2xl p-5 text-left text-white shadow-sm ${className}`} style={{ background: CARD_GRADIENT[account.currency] ?? CARD_GRADIENT.USD }}>
      
      <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10"/>
      <span className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-white/5"/>

      
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">{account.method}</p>
          <p className="text-xl font-bold leading-tight">{account.currency}</p>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
          Active
        </span>
      </div>

      
      <div className="relative z-10 flex flex-col gap-2">
        <span className="h-6 w-9 rounded-md bg-gradient-to-br from-white/70 to-white/40"/>
        <p className="num break-all text-[15px] font-medium leading-snug tracking-[0.12em]">{primaryNumber(account)}</p>
      </div>

      
      <div className="relative z-10 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-wide text-white/50">Bank</p>
          <p className="truncate text-sm font-semibold">{account.bankName}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[9px] font-medium uppercase tracking-wide text-white/50">Holder</p>
          <p className="truncate text-sm font-semibold">{holder}</p>
        </div>
      </div>
    </div>);
}
function VirtualCard({ account, onClick }: {
    account: VirtualAccount;
    onClick: () => void;
}) {
    return (<button type="button" onClick={onClick} className="shrink-0 snap-start cursor-pointer rounded-2xl opacity-95 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-100 focus:outline-none">
      <CardFace account={account}/>
    </button>);
}
function AccountModal({ account, onClose }: {
    account: VirtualAccount;
    onClose: () => void;
}) {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const handleCopyDetail = (label: string, value: string) => {
        copyToClipboard(value, label);

    };
    return (<BaseModal isOpen onClose={onClose} zIndex={1000}>
      <ModalHeader title="Account details" onClose={onClose}/>
      <div className="flex max-h-[80vh] w-[520px] flex-col overflow-hidden rounded-b-2xl border-2 border-primary-divider bg-background">
        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          
          <CardFace account={account} className="mx-auto"/>

          
          <SecondaryButton variant="light" buttonClassName="w-fit self-center whitespace-nowrap" onClick={() => {
            const allDetails = account.details.map((d) => `${d.label}: ${d.value}`).join("\n");
            copyToClipboard(allDetails, "All account details");
        }} text={<span className="flex items-center gap-2">
                <Copy width={14} height={14} strokeWidth={2}/>
                Copy all details
              </span>}/>

          
          <div className="flex flex-col rounded-xl border border-primary-divider px-4">
            {account.details.map((detail) => {
            const copied = copiedKey === detail.label;
            return (<div key={detail.label} className="flex items-center justify-between gap-4 border-b border-primary-divider py-3 last:border-0">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
                      {detail.label}
                    </span>
                    <span className="num break-all text-sm font-medium text-text-primary">{detail.value}</span>
                  </div>
                  <SecondaryButton variant="light" buttonClassName="w-fit shrink-0 whitespace-nowrap" onClick={() => handleCopyDetail(detail.label, detail.value)} text={<span className={`flex items-center gap-1.5 ${copied ? "text-text-primary" : ""}`}>
                        {copied ? <Check width={14} height={14} strokeWidth={2}/> : <Copy width={14} height={14} strokeWidth={2}/>}
                        {copied ? "Copied" : "Copy"}
                      </span>}/>
                </div>);
        })}
          </div>
        </div>
      </div>
    </BaseModal>);
}
export default function GlobalAccountPage() {
    const history = useProviderHistory();
    const VIRTUAL_ACCOUNTS = history.data?.globalAccounts.accounts || [];
    const RECENT_DEPOSITS = history.data?.globalAccounts.deposits || [];
    const { setTitle, setShowBackArrow } = useTitle();
    const [modalAccount, setModalAccount] = useState<VirtualAccount | null>(null);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="text-text-secondary">Receive</span>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Global Account</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    return (<div className="flex w-full h-full flex-col overflow-y-auto"><p className="px-6 pt-4 text-sm text-text-secondary">Historical examples. Bank collection requires a configured provider.</p>{history.error && <p role="alert">{history.error.message}</p>}
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Global Account</h1>
          <p className="text-[14px] text-text-secondary">Receive fiat deposits from anywhere in the world.</p>
        </div>
      </div>

      
      <div className="px-6 pb-3">
        <div className="flex items-start gap-2 rounded-xl border border-primary-divider bg-app-background p-3">
          <img src="/misc/info-icon.svg" alt="info" className="mt-0.5 h-4 w-4 shrink-0 opacity-40" onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
        }}/>
          <p className="text-xs leading-relaxed text-text-secondary">
            Your dedicated virtual bank accounts accept deposits in USD (ACH, Wire, SWIFT), EUR (SEPA), and AED (UAEFTS).
            Incoming funds are automatically converted and routed to your Settlbox wallet. Accounts are permanent and reusable.
          </p>
        </div>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-primary-divider p-4" style={CARD_BG_STYLE}>
          <span className="text-sm leading-none text-text-secondary">Active Accounts</span>
          <span className="num text-2xl leading-none text-text-primary">{VIRTUAL_ACCOUNTS.length}</span>
        </div>
        <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-primary-divider p-4" style={CARD_BG_STYLE}>
          <span className="text-sm leading-none text-text-secondary">Supported Currencies</span>
          <span className="text-2xl font-semibold leading-none text-text-primary">USD, EUR, AED</span>
        </div>
        <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-primary-divider p-4" style={CARD_BG_STYLE}>
          <span className="text-sm leading-none text-text-secondary">Total Received (30d)</span>
          <span className="num text-2xl leading-none" style={{ color: "var(--badge-success-text)" }}>
            $296,100.00
          </span>
        </div>
      </div>

      
      <div className="flex flex-col gap-1 px-6 pb-2 pt-3">
        <span className="text-lg font-semibold text-text-primary">Your Virtual Accounts</span>
        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 pt-2">
          {VIRTUAL_ACCOUNTS.map((account) => (<VirtualCard key={account.id} account={account} onClick={() => setModalAccount(account)}/>))}
        </div>
      </div>

      
      <div className="flex flex-col gap-3 px-6 pb-6 pt-3">
        <span className="text-lg font-semibold text-text-primary">Recent Deposits</span>
        <div className="overflow-hidden rounded-2xl border border-primary-divider bg-background">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary-divider bg-app-background">
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Sender</th>
                <th className="text-center text-xs font-medium text-text-secondary px-5 py-3">Method</th>
                <th className="text-center text-xs font-medium text-text-secondary px-5 py-3">Date</th>
                <th className="text-center text-xs font-medium text-text-secondary px-5 py-3">Amount</th>
                <th className="text-center text-xs font-medium text-text-secondary px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_DEPOSITS.map((deposit) => (<tr key={deposit.id} className="border-b border-primary-divider last:border-0">
                  <td className="px-5 py-3.5 text-sm font-medium text-text-primary">{deposit.sender}</td>
                  <td className="px-5 py-3.5 text-center text-sm text-text-secondary">
                    {deposit.currency} {deposit.method}
                  </td>
                  <td className="px-5 py-3.5 text-center text-sm text-text-secondary">
                    {new Date(deposit.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            })}
                  </td>
                  <td className="num px-5 py-3.5 text-center text-sm font-semibold text-text-primary">
                    {fmtCurrency(deposit.amount, deposit.currency)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Badge status={BadgeStatus.SUCCESS} text="Completed"/>
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {modalAccount && <AccountModal account={modalAccount} onClose={() => setModalAccount(null)}/>}
    </div>);
}
