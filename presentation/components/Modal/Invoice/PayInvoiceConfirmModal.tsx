"use client";
import { workspaceAction } from "@/presentation/services/api/seeded-workspace";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "../BaseModal";
import { ModalHeader } from "@/presentation/components/Common/ModalHeader";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { PayInvoiceConfirmModalProps } from "@/presentation/types/modal";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useListAccountsByCompany, useCreateProposalFromBills } from "@/presentation/services/api/multisig";
import { useInvoice } from "@/presentation/hooks/server/useInvoice";
import { BatchPaymentItem } from "@/presentation/types/dto/multisig";
import { n } from "@/presentation/services/utils/normalizeToken";
const formatAddress = (addr?: string) => {
    if (!addr)
        return "N/A";
    return addr.length > 18 ? `${addr.slice(0, 9)}...${addr.slice(-6)}` : addr;
};
const tokenLogo = (sym: string) => `/token/${(sym || "").toLowerCase()}.svg`;
export function PayInvoiceConfirmModal({ isOpen, onClose, zIndex, invoice, invoices, invoiceUUIDs, billUUID, }: ModalProp<PayInvoiceConfirmModalProps>) {
    const router = useRouter();
    const { data: company } = useGetMyCompany();
    const { data: accounts = [] } = useListAccountsByCompany(company?.id, { enabled: !!company?.id });
    const createProposalMutation = useCreateProposalFromBills();
    const { fetchInvoiceByUUID } = useInvoice();
    const preloaded = useMemo<any[] | null>(() => {
        if (invoices?.length)
            return invoices;
        if (invoice)
            return [invoice];
        return null;
    }, [invoices, invoice]);
    const [fetched, setFetched] = useState<any[] | null>(null);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const uuidKey = (invoiceUUIDs || []).join(",");
    useEffect(() => {
        if (preloaded)
            return;
        if (!invoiceUUIDs || invoiceUUIDs.length === 0)
            return;
        let mounted = true;
        setLoadingInvoices(true);
        Promise.all(invoiceUUIDs.map(u => fetchInvoiceByUUID(u).catch(() => null)))
            .then(res => {
            if (mounted)
                setFetched(res.filter(Boolean) as any[]);
        })
            .finally(() => {
            if (mounted)
                setLoadingInvoices(false);
        });
        return () => {
            mounted = false;
        };
    }, [preloaded, uuidKey]);
    const resolvedInvoices: any[] = preloaded ?? fetched ?? [];
    const isSingle = resolvedInvoices.length === 1;
    const single = resolvedInvoices[0];
    const initialCount = preloaded?.length ?? invoiceUUIDs?.length ?? 0;
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [description, setDescription] = useState(initialCount === 1 && preloaded?.[0]?.invoiceNumber
        ? `Payment for invoice ${preloaded[0].invoiceNumber}`
        : `Payment for ${initialCount} invoice(s)`);
    const [recipient, setRecipient] = useState("");
    const savedRecipient = isSingle ? single?.paymentWalletAddress || "" : "";
    const effectiveRecipient = recipient || savedRecipient;
    const [submitting, setSubmitting] = useState(false);
    const tokenTotals = useMemo(() => {
        const map = new Map<string, number>();
        resolvedInvoices.forEach(inv => {
            const sym = n(inv.paymentToken?.symbol) || n(inv.paymentToken?.name) || "USDC";
            map.set(sym, (map.get(sym) || 0) + (Number(inv.total) || 0));
        });
        return Array.from(map.entries()).map(([currency, total]) => ({ currency, total }));
    }, [resolvedInvoices]);
    const effectiveAccountId = selectedAccountId ?? accounts[0]?.accountId ?? null;
    const handleConfirm = async () => {
        if (!company?.id)
            return toast.error("Company not found");
        if (resolvedInvoices.length === 0)
            return toast.error("No invoices selected for payment");
        if (!effectiveAccountId) {
            return toast.error("No multisig account found. Please create one first.");
        }
        if (!description.trim())
            return toast.error("Proposal description cannot be empty");
        if (description.trim().length > 500) {
            return toast.error("Proposal description cannot exceed 500 characters");
        }
        try {
            setSubmitting(true);
            for (const invoice of resolvedInvoices) {
                await workspaceAction("bills", invoice.uuid, "pay", effectiveRecipient || invoice.paymentWalletAddress);
            }
            toast.success("Payment request submitted. Check its approval and settlement status.");
            onClose();
            router.push("/transactions");
        }
        catch (error: any) {
            console.error("Failed to create proposal:", error);
            toast.error(error?.message || "Failed to create payment proposal");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <div className="flex w-[440px] flex-col">
        <ModalHeader title="Confirm payment" onClose={onClose}/>
        <label className="px-5 pt-4 text-sm">Arc recipient wallet<input aria-label="Arc recipient wallet" className="mt-2 w-full rounded-xl border border-primary-divider p-3" placeholder="0x..." value={effectiveRecipient} onChange={event => setRecipient(event.target.value)}/></label>

        <div className="flex flex-col gap-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background p-5">
          
          <div className="flex flex-col gap-3 rounded-xl border border-primary-divider bg-app-background p-4">
            {loadingInvoices ? (<div className="py-4 text-center text-sm text-text-secondary">Loading invoices...</div>) : isSingle ? (<>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">Invoice</span>
                  <span className="text-sm font-medium text-text-primary">{single?.invoiceNumber || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">Recipient</span>
                  <span className="truncate text-sm font-medium text-text-primary">
                    {single?.fromDetails?.name || single?.fromDetails?.companyName || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">Pay to</span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatAddress(single?.paymentWalletAddress)}
                  </span>
                </div>
                <div className="h-px w-full bg-primary-divider"/>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">Amount</span>
                  <div className="flex items-center gap-2">
                    <img src={tokenLogo(n(single?.paymentToken?.symbol) || n(single?.paymentToken?.name) || "USDC")} alt="" className="h-5 w-5 shrink-0" onError={e => {
                (e.target as HTMLImageElement).src = "/token/any-token.svg";
            }}/>
                    <span className="num text-base font-semibold text-text-primary">
                      {single?.total} {n(single?.paymentToken?.symbol) || n(single?.paymentToken?.name)}
                    </span>
                  </div>
                </div>
              </>) : (<>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-text-primary">
                    {resolvedInvoices.length} invoices
                  </span>
                </div>
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                  {resolvedInvoices.map((inv, idx) => {
                const sym = n(inv.paymentToken?.symbol) || n(inv.paymentToken?.name) || "USDC";
                return (<div key={inv.uuid || inv.invoiceNumber || idx} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-text-primary">
                            {inv.invoiceNumber || inv.uuid}
                          </span>
                          <span className="truncate text-xs text-text-secondary">
                            {inv.fromDetails?.name || inv.fromDetails?.companyName || ""}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <img src={tokenLogo(sym)} alt="" className="h-4 w-4 shrink-0" onError={e => {
                        (e.target as HTMLImageElement).src = "/token/any-token.svg";
                    }}/>
                          <span className="num text-sm text-text-primary">
                            {inv.total} {sym}
                          </span>
                        </div>
                      </div>);
            })}
                </div>
                <div className="h-px w-full bg-primary-divider"/>
                {tokenTotals.map(t => (<div key={t.currency} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-text-secondary">Total ({t.currency})</span>
                    <span className="num text-base font-semibold text-text-primary">
                      {t.total} {t.currency}
                    </span>
                  </div>))}
              </>)}
          </div>

          
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary">Pay from</span>
            {accounts.length === 0 ? (<div className="rounded-xl border border-dashed border-primary-divider px-4 py-5 text-center text-sm text-text-secondary">
                No multisig account found. Please create one first.
              </div>) : (<div className="flex max-h-44 flex-col gap-2 overflow-y-auto">
                {accounts.slice(0, 1).map(acc => {
                const isSelected = effectiveAccountId === acc.accountId;
                return (<button key={acc.accountId} type="button" onClick={() => setSelectedAccountId(acc.accountId)} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${isSelected ? "border-primary-blue bg-app-background" : "border-primary-divider"}`}>
                      <img src={acc.logo ? acc.logo : "/client-invoice/payroll-icon.svg"} alt={acc.name} className="h-9 w-9 shrink-0 rounded-lg"/>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-text-primary">{acc.name}</span>
                        <span className="truncate text-xs text-text-secondary">{acc.description}</span>
                      </div>
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all" style={{
                        borderColor: isSelected ? "rgb(6, 110, 255)" : "var(--primary-divider)",
                        background: isSelected ? "rgb(6, 110, 255)" : "transparent",
                    }}>
                        {isSelected && (<svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>)}
                      </div>
                    </button>);
            })}
              </div>)}
          </div>

          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} aria-label="Proposal description" className="min-h-[72px] w-full resize-none rounded-xl border border-primary-divider bg-app-background p-3 text-sm text-text-primary focus:outline-none"/>
          </div>

          
          <div className="flex flex-row gap-2">
            <SecondaryButton text="Cancel" onClick={onClose} variant="light"/>
            <PrimaryButton text="Confirm payment" onClick={handleConfirm} loading={submitting} disabled={submitting || loadingInvoices || resolvedInvoices.length === 0 || accounts.length === 0}/>
          </div>
        </div>
      </div>
    </BaseModal>);
}
export default PayInvoiceConfirmModal;
