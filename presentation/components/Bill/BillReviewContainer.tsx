"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { NavArrowRight } from "iconoir-react";
import { SecondaryButton } from "../Common/SecondaryButton";
import FieldTextarea from "@/presentation/components/Common/Input/FieldTextarea";
import { useInvoice } from "@/presentation/hooks/server/useInvoice";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { useGetAllEmployeeGroups } from "@/presentation/services/api/employee";
import { CategoryShapeEnum, InvoiceTypeEnum } from "@/presentation/types/enums";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { ChooseAccountModalProps, InvoiceModalProps } from "@/presentation/types/modal";
import { PrimaryButton } from "../Common/PrimaryButton";
import toast from "react-hot-toast";
import { useCreateProposalFromBills, useListAccountsByCompany, } from "@/presentation/services/api/multisig";
import { BatchPaymentItem } from "@/presentation/types/dto/multisig";
import { useGetMyCompany } from "@/presentation/services/api/company";
const InvoiceItem = ({ invoiceId, name, amount, amountUsd, group, onViewClick, token, }: {
    invoiceId: string;
    name?: string;
    amount?: string;
    amountUsd?: string;
    group: {
        shape?: CategoryShapeEnum;
        color?: string;
        groupName?: string;
    };
    onViewClick?: () => void;
    token: string;
}) => {
    const { shape, color, groupName } = group || {};
    return (<div className="grid grid-cols-[64px_minmax(0,1fr)_auto_120px_80px] gap-4 items-center w-full border-b border-primary-divider px-4 py-3 bg-background rounded-xl">
      
      <span className="text-sm font-medium text-text-primary truncate">{invoiceId}</span>

      
      <span className="text-sm font-medium text-text-primary truncate">{name}</span>

      
      <div className="flex justify-center items-center">
        <CategoryBadge shape={(shape as CategoryShapeEnum) || CategoryShapeEnum.CIRCLE} color={color || "#35ADE9"} name={groupName || "-"}/>
      </div>
      
      <div className="flex items-end flex-col gap-2">
        <div className="flex flex-row gap-1 items-center">
          <img src={`/token/${token.toLowerCase()}.svg`} alt={token} className="w-5 shrink-0"/>
          <span className="text-sm font-medium text-text-primary leading-none whitespace-nowrap">{amount}</span>
        </div>
        
      </div>

      
      <button onClick={onViewClick} className="w-full px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-text-primary hover:bg-gray-200 transition-colors">
        View
      </button>
    </div>);
};
const TokenItem = ({ token, amount, amountUsd }: {
    token: string;
    amount: string;
    amountUsd?: string;
}) => {
    return (<div className="flex justify-start items-center gap-2">
      <img src={`/token/${token.toLowerCase()}.svg`} alt={token} className="w-10"/>

      <div className="flex items-start flex-col gap-0.5">
        <div className="text-[18px] leading-none">{amount}</div>
        {amountUsd && <div className="text-[16px] text-text-secondary leading-none">{amountUsd}</div>}
      </div>
    </div>);
};
const BillReviewContainer = () => {
    const router = useRouter();
    const { setTitle, setShowBackArrow, setOnBackClick } = useTitle();
    const { data: groups } = useGetAllEmployeeGroups();
    const { openModal, closeModal } = useModal();
    const { data: company } = useGetMyCompany();
    const createProposalMutation = useCreateProposalFromBills();
    const { data: multisigAccounts } = useListAccountsByCompany(company?.id);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/bill")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Bills
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Review invoices</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    const searchParams = useSearchParams();
    const { fetchInvoiceByUUID } = useInvoice();
    const [selectedInvoices, setSelectedInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const { register, watch, getValues } = useForm({
        defaultValues: {
            searchTerm: "",
            proposalDescription: "",
        },
    });
    const searchTerm = watch("searchTerm");
    const proposalDescription = watch("proposalDescription");
    const tokenTotals = React.useMemo(() => {
        const map = new Map<string, {
            total: number;
            totalUsd: number;
        }>();
        selectedInvoices.forEach(inv => {
            const currency = n(inv.paymentToken?.name || inv.invoice?.paymentToken?.name);
            const total = Number(inv.total) || 0;
            const totalUsd = Number(inv.totalUsd) || 0;
            const prev = map.get(currency) || { total: 0, totalUsd: 0 };
            prev.total += total;
            prev.totalUsd += totalUsd;
            map.set(currency, prev);
        });
        return Array.from(map.entries()).map(([currency, v]) => ({ currency, total: v.total, totalUsd: v.totalUsd }));
    }, [selectedInvoices]);
    const totalUsdSum = React.useMemo(() => tokenTotals.reduce((s, t) => s + (t.totalUsd || 0), 0), [tokenTotals]);
    const filteredInvoices = React.useMemo(() => {
        if (!searchTerm)
            return selectedInvoices;
        return selectedInvoices.filter(inv => inv.fromDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [selectedInvoices, searchTerm]);
    useEffect(() => {
        const uuids = searchParams?.getAll ? searchParams.getAll("invoiceUUID") : [];
        if (!uuids || uuids.length === 0)
            return;
        let mounted = true;
        setLoadingInvoices(true);
        Promise.all(uuids.map(u => fetchInvoiceByUUID(u).catch(err => null)))
            .then(results => {
            if (!mounted)
                return;
            setSelectedInvoices(results.filter(Boolean) as any[]);
        })
            .catch(err => console.error("Failed to fetch invoices", err))
            .finally(() => setLoadingInvoices(false));
        return () => {
            mounted = false;
        };
    }, [searchParams, fetchInvoiceByUUID]);
    const handlePayInvoice = () => {
        if (!company?.id) {
            return toast.error("Company not found");
        }
        if (!multisigAccounts || multisigAccounts.length === 0) {
            return toast.error("No multisig accounts found. Please create one first.");
        }
        openModal<ChooseAccountModalProps>("CHOOSE_ACCOUNT", {
            onConfirm: selectedAccount => {
                handleCreateProposal(selectedAccount.accountId);
            },
        });
    };
    const handleCreateProposal = async (accountId: string) => {
        if (selectedInvoices.length === 0) {
            return toast.error("No invoices selected for payment");
        }
        const description = getValues("proposalDescription").trim();
        if (description.length === 0) {
            return toast.error("Proposal description cannot be empty");
        }
        if (description.length > 500) {
            return toast.error("Proposal description cannot exceed 500 characters");
        }
        try {
            openModal("PROCESSING_TRANSACTION");
            const tokenAddressToAmount = new Map<string, string>();
            selectedInvoices.forEach(inv => {
                const faucetId = (inv.paymentToken as any)?.address;
                const amount = Math.floor(Number(inv.total) * Math.pow(10, (inv.paymentToken as any)?.decimals ?? 6));
                if (faucetId) {
                    const currentAmount = tokenAddressToAmount.get(faucetId) || "0";
                    tokenAddressToAmount.set(faucetId, (BigInt(currentAmount) + BigInt(amount)).toString());
                }
            });
            const tokens = Array.from(tokenAddressToAmount.entries()).map(([address, amount]) => {
                const paymentToken = selectedInvoices.find(inv => (inv.paymentToken as any)?.address === address)
                    ?.paymentToken as any;
                return {
                    address,
                    symbol: n(paymentToken?.symbol) || address,
                    decimals: paymentToken?.decimals ?? 6,
                    name: n(paymentToken?.name || paymentToken?.symbol) || address,
                    amount,
                };
            });
            const payments: BatchPaymentItem[] = selectedInvoices.map(inv => ({
                recipientId: inv.paymentWalletAddress,
                faucetId: (inv.paymentToken as any)?.address,
                amount: Math.floor(Number(inv.total) * Math.pow(10, (inv.paymentToken as any)?.decimals ?? 6)),
            }));
            await createProposalMutation.mutateAsync({
                accountId,
                billUUIDs: selectedInvoices.map(inv => inv.bill.uuid),
                description: description,
                tokens,
                payments,
            });
            closeModal("PROCESSING_TRANSACTION");
            toast.success(`Proposal created for ${selectedInvoices.length} invoice(s). Waiting for signatures.`);
            router.push("/transactions");
        }
        catch (error: any) {
            console.error("Failed to create proposal:", error);
            toast.error(error?.message || "Failed to create payment proposal");
        }
        finally {
            closeModal("PROCESSING_TRANSACTION");
        }
    };
    return (<div className="flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Review invoices</h1>
          <p className="text-[14px] text-text-secondary">
            Review the selected invoices and propose a payment from a multisig account.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-row px-6 pb-6">
        
        <div className="flex-1 min-w-0 border-r-0 border border-primary-divider rounded-l-2xl p-5 bg-app-background flex flex-col gap-5 overflow-y-auto">
          <div className=" flex flex-row justify-between w-full items-center">
            <span className="font-semibold text-lg">Invoice list</span>
            <span className="text-lg text-text-secondary">
              Number of invoices
              <span className="text-primary-blue"> {filteredInvoices.length || 0}</span>
            </span>
            <div className="bg-[#E7E7E7] border border-primary-divider flex flex-row gap-2 items-center pr-1 pl-3 py-1 rounded-lg w-[300px]">
              <div className="flex flex-row gap-2 flex-1">
                <input type="text" placeholder="Search by name" className="font-medium text-sm text-text-secondary bg-transparent border-none outline-none w-full" {...register("searchTerm")}/>
              </div>
              <button type="button" className="flex flex-row gap-1.5 items-center rounded-lg w-6 h-6 justify-center cursor-pointer">
                <img src="/wallet-analytics/finder.svg" alt="search" className="w-4 h-4"/>
              </button>
            </div>
          </div>
          {loadingInvoices ? (<div className="w-full flex justify-center items-center py-10">Loading selected invoices...</div>) : (filteredInvoices.length > 0 &&
            filteredInvoices.map(inv => {
                const groupData = groups?.find(grp => grp.id === inv.employee?.groupId);
                return (<InvoiceItem key={inv.uuid || inv.invoiceNumber} invoiceId={inv.invoiceNumber || inv.uuid} name={inv.fromDetails?.name || (inv.fromDetails as any).companyName} amount={`${inv.total || 0} ${n(inv.paymentToken.symbol)}`} token={n(inv.paymentToken.name).toLowerCase()} amountUsd={inv.totalUsd ? `$${inv.totalUsd}` : ""} group={{
                        shape: groupData?.shape || CategoryShapeEnum.CIRCLE,
                        color: groupData?.color || "#35ADE9",
                        groupName: groupData?.name || "Client",
                    }} onViewClick={() => {
                        openModal<InvoiceModalProps>("INVOICE_MODAL", {
                            invoice: {
                                amountDue: inv.total,
                                paymentToken: {
                                    name: n(inv.paymentToken.name),
                                },
                                billTo: {
                                    address: [
                                        inv.toDetails?.address1,
                                        inv.toDetails?.address2,
                                        inv.toDetails?.city,
                                        inv.toDetails?.country,
                                    ]
                                        .filter(Boolean)
                                        .join(", "),
                                    email: inv.toDetails?.email,
                                    name: inv.toCompany?.companyName,
                                    company: [inv.toCompany?.companyName, inv.toCompany?.companyType].filter(Boolean).join(" "),
                                },
                                currency: inv.currency,
                                date: inv.issueDate,
                                dueDate: inv.dueDate,
                                from: {
                                    name: inv.employee?.name,
                                    address: inv.employee?.address,
                                    email: inv.employee?.email,
                                    company: [inv.toCompany?.companyName, inv.toCompany?.companyType].filter(Boolean).join(" "),
                                },
                                invoiceNumber: inv.invoiceNumber,
                                items: inv.items.map((item: any) => ({
                                    name: item.description,
                                    rate: item.unitPrice,
                                    qty: item.quantity,
                                    amount: item.total,
                                })),
                                subtotal: inv.subtotal,
                                tax: 0,
                                total: inv.total,
                                walletAddress: inv.paymentWalletAddress,
                                network: "Arc Testnet",
                            },
                        });
                    }}/>);
            }))}
          
        </div>

        
        <div className="w-[400px] shrink-0 rounded-r-2xl border border-primary-divider bg-background flex flex-col min-h-0">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[20px] font-bold leading-tight text-text-primary">Payment Overview</h2>
              <p className="text-sm text-text-secondary">Make sure the details are correct before proceeding.</p>
            </div>

            
            <div className="flex flex-col gap-1.5">
              <FieldTextarea label="Proposal description" {...register("proposalDescription")} placeholder={`Payment for ${selectedInvoices.length} invoice(s)`} aria-label="Proposal description" maxLength={500} rows={4}/>
              {proposalDescription && proposalDescription.length > 0 && (<span className="self-end text-xs text-text-secondary">{proposalDescription.length}/500</span>)}
            </div>

            
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-text-primary">Total by token</span>
              {tokenTotals.length === 0 ? (<div className="rounded-xl border border-dashed border-primary-divider px-4 py-6 text-center text-sm text-text-secondary">
                  No invoices selected
                </div>) : (tokenTotals.map(t => (<div key={t.currency} className="flex items-center justify-between rounded-xl border border-primary-divider bg-app-background px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img src={`/token/${t.currency.toLowerCase()}.svg`} alt={t.currency} className="w-8 h-8" onError={e => {
                (e.target as HTMLImageElement).src = "/token/any-token.svg";
            }}/>
                      <span className="num text-[16px] text-text-primary">
                        {t.total} {t.currency}
                      </span>
                    </div>
                    {t.totalUsd ? <span className="text-sm text-text-secondary">${t.totalUsd}</span> : null}
                  </div>)))}
            </div>
          </div>

          
          <div className="flex flex-col gap-4 border-t border-primary-divider p-6">
            <div className="relative flex flex-col gap-1.5 overflow-hidden rounded-xl border border-primary-divider p-4" style={{
            backgroundImage: "url(/card/background.svg)",
            backgroundSize: "30%",
            backgroundPosition: "right",
            backgroundRepeat: "no-repeat",
        }}>
              <span className="text-sm leading-none text-text-secondary">Total amount</span>
              <span className="num text-3xl leading-none text-text-primary">
                {totalUsdSum > 0
            ? `$${totalUsdSum}`
            : tokenTotals.length === 1
                ? `${tokenTotals[0].total} ${tokenTotals[0].currency}`
                : `${selectedInvoices.length} invoices`}
              </span>
            </div>
            <PrimaryButton text="Propose" containerClassName="w-full" buttonClassName="whitespace-nowrap rounded-xl" onClick={handlePayInvoice} disabled={selectedInvoices.length === 0 || createProposalMutation.isPending} loading={createProposalMutation.isPending}/>
          </div>
        </div>
      </div>
    </div>);
};
export default BillReviewContainer;
