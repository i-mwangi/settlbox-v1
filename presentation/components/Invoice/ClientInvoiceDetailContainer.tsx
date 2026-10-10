"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import React, { use, useEffect, useState } from "react";
import BillDetailActionTooltip from "../Common/ToolTip/BillDetailActionTooltip";
import { Tooltip } from "react-tooltip";
import { Badge, BadgeStatus } from "../Common/Badge";
import { SecondaryButton } from "../Common/SecondaryButton";
import toast from "react-hot-toast";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { InvoiceModalProps } from "@/presentation/types/modal";
import { useRouter, useSearchParams } from "next/navigation";
import { getB2BInvoiceByUUID, downloadB2BInvoicePdf, cancelB2BInvoice } from "@/presentation/services/api/invoice";
import { InvoiceStatusEnum } from "@/presentation/types/enums";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { useGetAllEmployeeGroups } from "@/presentation/services/api/employee";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { Check, NavArrowRight } from "iconoir-react";
const ClientInvoiceDetailContainer = () => {
    const router = useRouter();
    const { openModal } = useModal();
    const searchParams = useSearchParams();
    const invoiceUUID = searchParams.get("id") || "";
    const [isLoading, setIsLoading] = useState(false);
    const [invoice, setInvoice] = useState<any>(null);
    const { data: groups } = useGetAllEmployeeGroups();
    const { setTitle, setShowBackArrow } = useTitle();
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/invoice")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Invoice
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">{invoice?.invoiceNumber || "Detail"}</span>
      </div>);
        setShowBackArrow(false);
    }, [invoice?.invoiceNumber]);
    const handleCopyInvoiceLink = async () => {
        try {
            const link = `${window.location.origin}/invoice-review/b2b?id=${invoiceUUID}`;
            await navigator.clipboard.writeText(link);
            toast.success("Invoice link copied to clipboard");
        }
        catch (err) {
            console.error("Failed to copy invoice link", err);
            toast.error("Failed to copy invoice link");
        }
    };
    const handleDownloadPDF = async () => {
        if (!invoice)
            return;
        try {
            const blob = await downloadB2BInvoicePdf(invoiceUUID);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `invoice-${invoice.invoiceNumber || invoiceUUID}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Invoice downloaded successfully");
        }
        catch (err) {
            console.error("Failed to download PDF:", err);
            toast.error("Failed to download invoice PDF");
        }
    };
    const handleDeleteInvoice = async () => {
        try {
            await cancelB2BInvoice(invoiceUUID);
            toast.success("Invoice cancelled successfully");
            router.replace("/invoice");
        }
        catch (err) {
            console.error("Failed to cancel invoice:", err);
            toast.error("Failed to cancel invoice");
        }
    };
    const formatDate = (dateString?: string) => {
        if (!dateString)
            return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };
    const formatDateTime = (dateString?: string) => {
        if (!dateString)
            return "N/A";
        return new Date(dateString).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };
    const getStatusBadge = (status?: InvoiceStatusEnum) => {
        switch (status) {
            case InvoiceStatusEnum.PAID:
                return { text: "PAID", status: BadgeStatus.SUCCESS };
            case InvoiceStatusEnum.CANCELLED:
                return { text: "CANCELLED", status: BadgeStatus.FAIL };
            case InvoiceStatusEnum.DRAFT:
                return { text: "DRAFT", status: BadgeStatus.NEUTRAL };
            default:
                return { text: status || "AWAITING", status: BadgeStatus.AWAITING };
        }
    };
    const loadInvoice = async () => {
        setIsLoading(true);
        try {
            const response = await getB2BInvoiceByUUID(invoiceUUID);
            setInvoice(response);
        }
        catch (err) {
            console.error("Failed to load invoice:", err);
            toast.error("Failed to load invoice");
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        if (invoiceUUID) {
            loadInvoice();
        }
    }, [invoiceUUID]);
    if (isLoading || !invoice) {
        return (<div className="flex items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>);
    }
    const statusBadge = getStatusBadge(invoice.status);
    return (<div className="flex w-full h-full flex-col bg-background overflow-y-auto">
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">
              Invoice {invoice.invoiceNumber}
            </h1>
            <Badge text={statusBadge.text} status={statusBadge.status}/>
          </div>
          <p className="text-[14px] text-text-secondary">Invoice from {invoice.fromDetails?.name || "N/A"}</p>
        </div>

        <div className="flex shrink-0 flex-row gap-2">
          <SecondaryButton text="View invoice PDF" variant="light" buttonClassName="w-fit whitespace-nowrap" onClick={() => {
            openModal<InvoiceModalProps>("INVOICE_MODAL", {
                invoice: {
                    amountDue: invoice.total!,
                    billTo: {
                        address: invoice.toCompanyAddress ||
                            [
                                invoice.toDetails?.address1,
                                invoice.toDetails?.address2,
                                invoice.toDetails?.city,
                                invoice.toDetails?.country,
                            ]
                                .filter(Boolean)
                                .join(", "),
                        email: invoice.toCompanyEmail || invoice.emailTo,
                        name: invoice.toCompanyContactName || invoice.toCompanyName,
                        company: invoice.toCompanyName || "",
                    },
                    paymentToken: {
                        name: n(invoice.paymentToken?.symbol) || "USDC",
                    },
                    currency: invoice.currency || "USD",
                    date: invoice.issueDate!,
                    dueDate: invoice.dueDate!,
                    from: {
                        name: invoice.fromDetails?.contactName || invoice.fromDetails?.companyName || "",
                        address: [
                            invoice.fromDetails?.address1,
                            invoice.fromDetails?.city,
                            invoice.fromDetails?.state,
                            invoice.fromDetails?.country,
                            invoice.fromDetails?.postalCode,
                        ]
                            .filter(Boolean)
                            .join(", "),
                        email: invoice.fromDetails?.email || "",
                        company: invoice.fromDetails?.companyName || "",
                    },
                    invoiceNumber: invoice.invoiceNumber!,
                    items: invoice.items?.map((item: any) => ({
                        name: item.description,
                        rate: item.unitPrice,
                        qty: item.quantity,
                        amount: item.total,
                    })) || [],
                    subtotal: parseFloat(invoice.subtotal?.toString() || "0"),
                    tax: 0,
                    total: parseFloat(invoice.total?.toString() || "0"),
                    walletAddress: invoice.paymentWalletAddress || invoice.walletAddress || "",
                    network: invoice.paymentNetwork?.name || "Arc Testnet",
                },
            });
        }}/>
          {invoice.status !== InvoiceStatusEnum.PAID && invoice.status !== InvoiceStatusEnum.CANCELLED && (<img src="/misc/three-dot-icon.svg" alt="" data-tooltip-id="bill-detail-action-tooltip" data-tooltip-content="0" className="w-6 cursor-pointer"/>)}
        </div>
      </div>

      
      {<Tooltip id="bill-detail-action-tooltip" clickable style={{
                zIndex: 20,
                borderRadius: "16px",
                padding: "0",
            }} place="left" openOnClick noArrow border="none" opacity={1} render={() => {
                const isPaidOrCancelled = invoice.status === InvoiceStatusEnum.PAID || invoice.status === InvoiceStatusEnum.CANCELLED;
                return (<BillDetailActionTooltip onEdit={handleCopyInvoiceLink} onDuplicate={handleDownloadPDF} onRemove={handleDeleteInvoice} showDelete={!isPaidOrCancelled}/>);
            }}/>}

      <div className="w-full flex flex-row gap-10 px-6 pb-6">
        <div className="flex-1 flex flex-col gap-6 w-full">
          
          <div className="flex flex-row gap-3 w-full">
            
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 flex gap-8">
              <div className="flex flex-col gap-4 w-fit">
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Created on</p>
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Invoice amount</p>
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Issued date</p>
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Due date</p>
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Currency</p>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <p className="text-sm text-gray-900 font-medium">{formatDate(invoice.createdAt)}</p>
                <div className="flex items-center gap-2">
                  <img src={`/token/${n(invoice.paymentToken?.symbol).toLowerCase()}.svg`} alt={invoice.paymentToken?.symbol || "Token"} className="w-5 h-5" onError={(e: any) => {
            e.target.src = "/token/usdc.svg";
        }}/>
                  <p className="text-sm text-gray-900 font-medium">
                    {invoice.total} {n(invoice.paymentToken?.symbol) || invoice.currency}
                  </p>
                </div>
                <p className="text-sm text-gray-900 font-medium">{formatDate(invoice.issueDate)}</p>
                <p className="text-sm text-gray-900 font-medium">{formatDate(invoice.dueDate)}</p>
                <p className="text-sm text-gray-900 font-medium">{invoice.currency || "USD"}</p>
              </div>
            </div>

            
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex flex-row gap-5">
                <div className="w-30">
                  <p className="text-sm text-gray-500 font-medium whitespace-nowrap">From</p>
                </div>
                <div className="flex flex-col gap-0">
                  <p className="text-sm text-gray-900 font-medium">
                    {invoice.fromDetails?.companyName || invoice.fromDetails?.contactName || "-"}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">{invoice.fromDetails?.email || "-"}</p>
                </div>
              </div>
              <div className="flex flex-row gap-5">
                <div className="w-30">
                  <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Billed to</p>
                </div>
                <div className="flex flex-col gap-0">
                  <p className="text-sm text-gray-900 font-medium">
                    {invoice.toCompanyName || invoice.toCompanyContactName || "-"}{" "}
                  </p>
                  <p className="text-sm text-blue-600 font-medium">
                    {invoice.toCompanyEmail || invoice.emailTo || "-"}
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-5">
                <div className="w-30">
                  <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Default method</p>
                </div>

                <div className="flex items-center gap-2">
                  <img src={`/token/${n(invoice.paymentToken?.symbol).toLowerCase()}.svg`} alt={invoice.paymentToken?.symbol || "Token"} className="w-5 h-5" onError={(e: any) => {
            e.target.src = "/token/usdc.svg";
        }}/>
                  <p className="text-sm text-gray-900 font-medium">
                    {n(invoice.paymentToken?.symbol)} ({invoice.paymentNetwork?.name || "Arc Testnet"})
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-5">
                <div className="w-30">
                  <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Payment address</p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-900 font-medium">
                    {invoice.paymentWalletAddress || invoice.walletAddress || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-medium text-text-primary">Summary</h2>

            
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              
              <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr] gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm text-gray-600 font-medium">Item details</p>
                <p className="text-sm text-gray-600 font-medium text-center">Qty</p>
                <p className="text-sm text-gray-600 font-medium text-right">Price</p>
                <p className="text-sm text-gray-600 font-medium text-right">Amount</p>
              </div>

              
              {invoice.items?.map((item: any, idx: number) => (<div key={idx} className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr] gap-3 px-4 py-3 border-b border-gray-200">
                  <p className="text-sm text-gray-900 font-medium">{item.description}</p>
                  <p className="text-sm text-gray-900 font-medium text-center">{item.quantity}</p>
                  <p className="text-sm text-gray-900 font-medium text-right">
                    {Number(item.unitPrice).toFixed(2)} {n(invoice.paymentToken?.name)}
                  </p>
                  <p className="text-sm text-gray-900 font-medium text-right">
                    {Number(item.total).toFixed(2)} {n(invoice.paymentToken?.name)}
                  </p>
                </div>))}

              
              <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr] gap-3 px-4 py-3 border-b border-gray-200">
                <div />
                <div />
                <p className="text-sm text-gray-900 font-medium text-right">Subtotal</p>
                <p className="text-base text-gray-900 font-semibold text-right">
                  {Number(invoice.subtotal).toFixed(2)} {n(invoice.paymentToken?.name)}
                </p>
              </div>

              
              <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr] gap-3 px-4 py-3 bg-blue-50">
                <div />
                <div />
                <p className="text-sm text-gray-900 font-medium text-right">Amount due</p>
                <p className="text-base text-gray-900 font-semibold text-right">
                  {Number(invoice.total).toFixed(2)} {n(invoice.paymentToken?.name)}
                </p>
              </div>
            </div>
          </div>
        </div>

        
        <div className="w-80 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Timeline</h2>

          <div className="flex-1 rounded-2xl border border-primary-divider bg-app-background p-5">
            <ol className="flex flex-col">
              {(() => {
            const items = [
                { label: "Invoice created", date: formatDateTime(invoice.createdAt), done: true },
                invoice.sentAt && { label: "Invoice sent", date: formatDateTime(invoice.sentAt), done: true },
                invoice.reviewedAt && { label: "Invoice reviewed", date: formatDateTime(invoice.reviewedAt), done: true },
                invoice.confirmedAt && { label: "Invoice confirmed", date: formatDateTime(invoice.confirmedAt), done: true },
                invoice.paidAt && { label: "Invoice paid", date: formatDateTime(invoice.paidAt), done: true },
                invoice.status !== InvoiceStatusEnum.PAID &&
                    invoice.status !== InvoiceStatusEnum.CANCELLED && {
                    label: "Awaiting payment",
                    date: "In progress",
                    done: false,
                    pending: true,
                },
            ].filter(Boolean);
            return items.map((item: any, idx: number) => {
                const isLast = idx === items.length - 1;
                const nextPending = items[idx + 1]?.pending;
                return (<li key={idx} className="relative flex gap-3.5 pb-6 last:pb-0">
                      {!isLast && (<span aria-hidden className={`absolute left-[15px] top-9 bottom-0 w-0.5 ${nextPending ? "bg-primary-divider" : "bg-primary-blue/40"}`}/>)}
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.done
                        ? "bg-primary-blue text-white" : "border-2 border-primary-blue/40 bg-primary-blue/5"}`}>
                        {item.done ? (<Check width={16} height={16} strokeWidth={2.5}/>) : (<span className="h-2.5 w-2.5 rounded-full bg-primary-blue animate-pulse"/>)}
                      </span>
                      <div className="flex flex-col gap-0.5 pt-1">
                        <p className={`text-sm font-semibold leading-tight ${item.pending ? "text-text-secondary" : "text-text-primary"}`}>
                          {item.label}
                        </p>
                        {item.date && item.date !== "N/A" && (<p className="text-xs text-text-secondary leading-tight">{item.date}</p>)}
                      </div>
                    </li>);
            });
        })()}
            </ol>
          </div>
        </div>
      </div>
    </div>);
};
export default ClientInvoiceDetailContainer;
