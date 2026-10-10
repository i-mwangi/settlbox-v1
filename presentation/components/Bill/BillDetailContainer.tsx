"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import React, { use, useEffect, useState } from "react";
import { Badge, BadgeStatus } from "../Common/Badge";
import { SecondaryButton } from "../Common/SecondaryButton";
import toast from "react-hot-toast";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { PayInvoiceConfirmModalProps } from "@/presentation/types/modal";
import { useRouter, useSearchParams } from "next/navigation";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight, Check } from "iconoir-react";
import InvoicePreview from "@/presentation/components/Common/Invoice/InvoicePreview";
import { useInvoice } from "@/presentation/hooks/server/useInvoice";
import { InvoiceStatusEnum } from "@/presentation/types/enums";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { useGetAllEmployeeGroups } from "@/presentation/services/api/employee";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { useGetBillDetail } from "@/presentation/services/api/bill";
import { BillTimelineDto } from "@/presentation/types/dto/bill";
const BillDetailContainer = () => {
    const router = useRouter();
    const { openModal } = useModal();
    const { setTitle, setShowBackArrow } = useTitle();
    const searchParams = useSearchParams();
    const invoiceUUID = searchParams.get("uuid") || "";
    const billUUID = searchParams.get("billUuid") || "";
    const { isLoading, fetchInvoiceByUUID, downloadPdf, cancelInvoiceData } = useInvoice();
    const [invoice, setInvoice] = useState<any>(null);
    const { data: groups } = useGetAllEmployeeGroups();
    const { data: billDetail } = useGetBillDetail(billUUID, { enabled: !!billUUID });
    const handleCopyInvoiceLink = () => {
        console.log("Copy invoice link clicked");
    };
    const handleDownloadPDF = async () => {
        if (!invoice)
            return;
        try {
            const blob = await downloadPdf(invoiceUUID);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `invoice-${invoice.invoiceNumber || invoiceUUID}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
        catch (err) {
            console.error("Failed to download PDF:", err);
            toast.error("Failed to download invoice PDF");
        }
    };
    const handleDeleteInvoice = async () => {
        await cancelInvoiceData(invoiceUUID);
        toast.success("Invoice cancelled successfully");
        router.replace("/bill");
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
    const getTimelineLabel = (event: string): string => {
        const labels: Record<string, string> = {
            invoice_created: "Invoice created",
            invoice_sent: "Invoice sent",
            invoice_reviewed: "Invoice reviewed",
            invoice_confirmed: "Invoice confirmed",
            bill_created: "Bill created",
            bill_paid: "Bill paid",
            proposal_created: "Payment proposal created",
            proposal_signed: "Proposal signed",
            proposal_executed: "Payment executed",
            proposal_cancelled: "Proposal cancelled",
            proposal_failed: "Proposal failed",
        };
        return labels[event] || event.replace(/_/g, " ");
    };
    const timelineItems = React.useMemo(() => {
        if (billDetail?.timeline && billDetail.timeline.length > 0) {
            return billDetail.timeline.map((t: BillTimelineDto) => ({
                label: getTimelineLabel(t.event),
                date: formatDateTime(t.timestamp as string),
                metadata: t.metadata,
            }));
        }
        return [
            { label: "Invoice created", date: formatDateTime(invoice?.createdAt || invoice?.issueDate) },
            invoice?.sentAt && { label: "Invoice sent", date: formatDateTime(invoice.sentAt) },
            invoice?.reviewedAt && { label: "Invoice reviewed", date: formatDateTime(invoice.reviewedAt) },
            invoice?.confirmedAt && { label: "Invoice confirmed", date: formatDateTime(invoice.confirmedAt) },
            invoice?.paidAt && { label: "Invoice paid", date: formatDateTime(invoice.paidAt) },
        ].filter(Boolean);
    }, [billDetail?.timeline, invoice]);
    const loadInvoice = async () => {
        try {
            const data = await fetchInvoiceByUUID(invoiceUUID);
            setInvoice(data);
        }
        catch (err) {
            console.error("Failed to load invoice:", err);
        }
    };
    useEffect(() => {
        if (invoiceUUID) {
            loadInvoice();
        }
    }, [invoiceUUID]);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/bill")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Bills
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">
          {invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Invoice"}
        </span>
      </div>);
        setShowBackArrow(false);
    }, [invoice?.invoiceNumber]);
    if (isLoading || !invoice) {
        return (<div className="flex items-center justify-center w-full h-full">
        <div className="w-12 h-12 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"/>
      </div>);
    }
    const statusBadge = getStatusBadge(invoice.status);
    const isClosed = invoice.status === InvoiceStatusEnum.PAID || invoice.status === InvoiceStatusEnum.CANCELLED;
    const lifecycleItems = [
        ...timelineItems.map((it: any) => ({ ...it, done: true, pending: false })),
        ...(isClosed ? [] : [{ label: "Awaiting payment", date: "In progress", done: false, pending: true }]),
    ];
    const group = groups?.find(grp => grp.id === invoice?.employee?.groupId);
    const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.issueDate,
        dueDate: invoice.dueDate,
        logo: invoice.fromCompany?.logo || null,
        from: {
            name: invoice.fromDetails?.name || "",
            email: invoice.fromDetails?.email || "",
            company: invoice.fromCompany?.companyName || invoice.payroll?.company?.companyName || "",
            address: invoice.fromDetails?.address || "",
            network: invoice.paymentNetwork?.name || "Arc Testnet",
            token: n(invoice.paymentToken?.symbol) || "USDC",
            walletAddress: invoice.paymentWalletAddress || "",
        },
        billTo: {
            name: invoice.toCompany?.companyName || invoice.toDetails?.companyName || "",
            email: invoice.toCompany?.email || invoice.toDetails?.email || "",
            company: invoice.toCompany?.companyName || "",
            address: [invoice.toDetails?.address1, invoice.toDetails?.address2, invoice.toDetails?.city, invoice.toDetails?.country]
                .filter(Boolean)
                .join(", "),
        },
        items: (invoice.items || []).map((item: any) => ({
            description: item.description || "",
            qty: parseFloat(item.quantity || "1"),
            price: parseFloat(item.unitPrice || "0"),
            amount: parseFloat(item.total || "0"),
            currency: invoice.currency || "USD",
        })),
        subtotal: parseFloat(invoice.subtotal || "0"),
        total: parseFloat(invoice.total || "0"),
        amountDue: parseFloat(invoice.total || "0"),
        currency: n(invoice.paymentToken?.symbol) || "USDC",
        status: invoice.status,
    };
    return (<div className="flex w-full h-full flex-col overflow-y-auto bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">
              Invoice {invoice.invoiceNumber}
            </h1>
            <Badge text={statusBadge.text} status={statusBadge.status}/>
            <CategoryBadge shape={group?.shape || CategoryShapeEnum.CIRCLE} color={group?.color || "#35ADE9"} name={group?.name || "Client"}/>
          </div>
          <p className="text-[14px] text-text-secondary">Invoice from {invoice.fromDetails?.name || "N/A"}</p>
        </div>

        <div className="flex shrink-0 flex-row gap-2">
          {invoice.status !== InvoiceStatusEnum.PAID && invoice.status !== InvoiceStatusEnum.CANCELLED && (<SecondaryButton text="Delete invoice" variant="red" buttonClassName="w-fit whitespace-nowrap" onClick={() => {
                openModal("REMOVE_INVOICE", {
                    invoiceOwnerName: invoice.fromDetails?.name || "",
                    onRemove: handleDeleteInvoice,
                });
            }}/>)}
          {invoice.status !== InvoiceStatusEnum.PAID && invoice.status !== InvoiceStatusEnum.CANCELLED && (<SecondaryButton text="Pay Invoice" buttonClassName="w-fit whitespace-nowrap" onClick={() => {
                openModal<PayInvoiceConfirmModalProps>("PAY_INVOICE_CONFIRM", { invoice, billUUID });
            }}/>)}
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col 2xl:flex-row items-stretch gap-5 px-6 pb-6">
        <div className="w-full min-w-0 2xl:flex-1">
          <InvoicePreview {...invoiceData} onDownload={handleDownloadPDF}/>
        </div>

        
        <div className="flex w-full 2xl:w-80 shrink-0 flex-col gap-3">
          <h2 className="text-lg font-semibold text-text-primary">Timeline</h2>

          <div className="flex-1 rounded-2xl border border-primary-divider bg-app-background p-5">
            <ol className="flex flex-col">
              {lifecycleItems.map((item: any, idx: number) => {
            const isLast = idx === lifecycleItems.length - 1;
            const nextPending = lifecycleItems[idx + 1]?.pending;
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
                      {item.metadata?.signerName && (<p className="text-xs text-text-secondary leading-tight">
                          Signed by {item.metadata.signerName}
                        </p>)}
                    </div>
                  </li>);
        })}
            </ol>
          </div>
        </div>
      </div>
    </div>);
};
export default BillDetailContainer;
