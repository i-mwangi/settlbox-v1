"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import React, { useState, useEffect } from "react";
import { NavArrowRight } from "iconoir-react";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { TabContainer } from "../Common/TabContainer";
import { SecondaryButton } from "../Common/SecondaryButton";
import { Badge, BadgeStatus } from "../Common/Badge";
import { Table } from "../Common/Table";
import { CustomCheckbox } from "../Common/CustomCheckbox";
import { FloatingAction } from "./FloatingAction";
import { getB2BInvoices, getB2BInvoiceStats, downloadB2BInvoicePdf, deleteB2BInvoice } from "@/presentation/services/api/invoice";
import { B2BInvoiceQueryDto } from "@/presentation/types/dto/invoice";
import { InvoiceStatusEnum } from "@/presentation/types/enums";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { useGetAllEmployeeGroups } from "@/presentation/services/api/employee";
import { Tooltip } from "react-tooltip";
import ClientActionTooltip from "../Common/ToolTip/ClientActionTooltip";
import { useDeleteBill } from "@/presentation/services/api/bill";
import { useInvoice } from "@/presentation/hooks/server/useInvoice";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { PrimaryButton } from "../Common/PrimaryButton";
import { cancelB2BInvoice } from "@/presentation/services/api/invoice";
import { useAuth } from "@/presentation/services/auth/context";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
type Tab = "all" | "sent" | "draft" | "paid";
const Card = ({ title, text }: {
    title: string;
    text: React.ReactNode;
}) => {
    return (<div className="relative w-full h-full rounded-xl border border-primary-divider p-4 flex flex-col overflow-hidden gap-3" style={{
            backgroundImage: `url(/card/background.svg)`,
            backgroundSize: "30%",
            backgroundPosition: "right",
            backgroundRepeat: "no-repeat",
        }}>
      <span className="text-text-secondary text-sm leading-none">{title}</span>
      {text}
    </div>);
};
const ClientInvoiceContainer = () => {
    const { setTitle, setShowBackArrow } = useTitle();
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [checkedRows, setCheckedRows] = React.useState<number[]>([]);
    const tabLabel = activeTab === "sent" ? "Sent" : activeTab === "draft" ? "Draft" : activeTab === "paid" ? "Paid" : "All";
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="text-text-secondary">Receive</span>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <button type="button" onClick={() => setActiveTab("all")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Invoice
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">{tabLabel}</span>
      </div>);
        setShowBackArrow(false);
    }, [activeTab]);
    const { data: groups } = useGetAllEmployeeGroups();
    const queryClient = useQueryClient();
    const { openModal } = useModal();
    const { user } = useAuth();
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const { data: invoiceStats } = useQuery({
        queryKey: ["b2b-invoice-stats"],
        queryFn: getB2BInvoiceStats,
    });
    const billActionRenderer = (rowData: Record<string, any>, index: number) => isAdmin ? (<div className="flex items-center justify-center w-full" onClick={e => e.stopPropagation()}>
        <img src="/misc/three-dot-icon.svg" alt="three dot icon" className="w-6 h-6 cursor-pointer" data-tooltip-id="bill-action-tooltip" data-tooltip-content={rowData.__id?.toString()}/>
      </div>) : null;
    const handleCheckRow = (idx: number) => {
        setCheckedRows(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
    };
    const handleCheckAll = () => {
        if (checkedRows.length === (invoiceDatas?.length || 0)) {
            setCheckedRows([]);
        }
        else {
            setCheckedRows(invoiceDatas?.map((_: any, idx: number) => idx) || []);
        }
    };
    const { data: invoicesResponse, isLoading } = useQuery({
        queryKey: ["b2b-invoices", activeTab],
        queryFn: () => getB2BInvoices({
            page: 1,
            limit: 1000,
            direction: "sent",
            status: activeTab === "all"
                ? undefined
                : activeTab === "sent"
                    ? InvoiceStatusEnum.SENT
                    : activeTab === "draft"
                        ? InvoiceStatusEnum.DRAFT
                        : InvoiceStatusEnum.PAID,
        }),
    });
    const invoices = React.useMemo(() => {
        return invoicesResponse?.invoices ?? [];
    }, [invoicesResponse]);
    const router = useRouter();
    const deleteInvoiceMutation = useMutation({
        mutationFn: (invoiceUUID: string) => deleteB2BInvoice(invoiceUUID),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["b2b-invoices"] });
            queryClient.invalidateQueries({ queryKey: ["b2b-invoice-stats"] });
            toast.success("Invoice deleted successfully");
            trackEvent(PostHogEvent.INVOICE_DELETED);
        },
        onError: (err: any) => {
            console.error("Delete invoice failed", err);
            toast.error("Failed to delete invoice");
        },
    });
    const voidInvoiceMutation = useMutation({
        mutationFn: (invoiceUUID: string) => cancelB2BInvoice(invoiceUUID),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["b2b-invoices"] });
            queryClient.invalidateQueries({ queryKey: ["b2b-invoice-stats"] });
            toast.success("Invoice voided successfully");
            trackEvent(PostHogEvent.INVOICE_VOIDED);
        },
        onError: (err: any) => {
            console.error("Void invoice failed", err);
            toast.error("Failed to void invoice");
        },
    });
    const invoiceDatas = invoices.map((invoice: any, idx: number) => {
        const createdDate = invoice.createdAt
            ? new Date(invoice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "";
        const dueDate = invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "";
        const badgeStatus = (() => {
            switch (invoice.status) {
                case InvoiceStatusEnum.PAID:
                    return BadgeStatus.SUCCESS;
                case InvoiceStatusEnum.SENT:
                case InvoiceStatusEnum.CONFIRMED:
                    return BadgeStatus.AWAITING;
                case InvoiceStatusEnum.CANCELLED:
                    return BadgeStatus.FAIL;
                case InvoiceStatusEnum.DRAFT:
                    return BadgeStatus.NEUTRAL;
                default:
                    return BadgeStatus.NEUTRAL;
            }
        })();
        return {
            __id: invoice.id,
            __invoiceUuid: invoice.uuid,
            "header-0": (<div className="flex justify-center items-center" onClick={e => e.stopPropagation()}>
          <CustomCheckbox checked={checkedRows.includes(idx)} onChange={() => handleCheckRow(idx)}/>
        </div>),
            "Creation date": createdDate,
            Invoice: invoice.invoiceNumber || invoice.uuid,
            Name: invoice.toCompanyName || invoice.toCompany?.companyName || invoice.fromDetails?.companyName || "-",
            Email: invoice.toCompanyEmail || invoice.emailTo || "-",
            Amount: (<div className="flex items-center gap-2 justify-center">
          <span className="num">{invoice.total || "0"}</span>
          <img alt={`${n(invoice.paymentToken?.symbol).toLowerCase()}`} className="w-4" src={`/token/${n(invoice.paymentToken?.symbol).toLowerCase()}.svg`} onError={e => {
                    (e.target as HTMLImageElement).src = "/token/usdc.svg";
                }}/>
        </div>),
            "Due Date": dueDate,
            Status: (<div className="w-full flex justify-center items-center">
          <Badge text={invoice.status} status={badgeStatus}/>
        </div>),
        };
    });
    const isAllChecked = checkedRows.length === invoiceDatas?.length;
    return (<div className="relative flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Invoices</h1>
          <p className="text-[14px] text-text-secondary">Create and manage the invoices you send to clients.</p>
        </div>
        <PrimaryButton text="Create invoice" onClick={() => router.push("/invoice/create")} containerClassName="w-fit" buttonClassName="whitespace-nowrap"/>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <Card title="All invoices" text={<span className="num text-text-primary text-2xl leading-none">{invoiceStats?.total ?? 0}</span>}/>
        <Card title="Sent" text={<span className="num text-text-primary text-2xl leading-none">{invoiceStats?.sent ?? 0}</span>}/>
        <Card title="Draft" text={<span className="num text-text-primary text-2xl leading-none">{invoiceStats?.draft ?? 0}</span>}/>
        <Card title="Paid" text={<span className="num text-text-primary text-2xl leading-none">{invoiceStats?.paid ?? 0}</span>}/>
      </div>

      
      <div className="mt-2 flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
        <TabContainer tabs={[
            { id: "all", label: "All" },
            { id: "sent", label: "Sent" },
            { id: "draft", label: "Draft" },
            { id: "paid", label: "Paid" },
        ]} activeTab={activeTab} setActiveTab={setActiveTab} textSize="sm"/>
        <span className="text-sm text-text-secondary">{invoiceDatas.length} invoices</span>
      </div>

      
      <div className="w-full p-5">
        <Table headers={[
            <div className="flex justify-center items-center">
              <CustomCheckbox checked={isAllChecked as boolean} onChange={handleCheckAll}/>
            </div>,
            "Creation date",
            "Invoice",
            "Name",
            "Email",
            "Amount",
            "Due Date",
            "Status",
        ]} data={invoiceDatas} className="w-full" rowClassName="py-5" headerClassName="py-3" showFooter={false} showPagination={true} actionColumn={true} actionRenderer={billActionRenderer} currentPage={currentPage} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage} onRowClick={rowData => {
            const invoiceUUID = (rowData as any).__invoiceUuid;
            router.push(`/invoice/detail?id=${invoiceUUID}`);
        }}/>
      </div>

      <Tooltip id="bill-action-tooltip" clickable style={{
            zIndex: 20,
            borderRadius: "16px",
            padding: "0",
        }} place="left" openOnClick noArrow border="none" opacity={1} render={({ content }) => {
            if (!content)
                return null;
            const id = parseInt(content, 10);
            const invoice = invoices?.find((inv: any) => inv.id === id);
            if (!invoice)
                return null;
            const handlePay = async () => {
                router.push(`/invoice/detail?id=${invoice.uuid}`);
            };
            const handleDelete = () => {
                openModal("REMOVE_INVOICE", {
                    invoiceOwnerName: invoice.toCompanyName || invoice.fromDetails?.companyName || "",
                    onRemove: async () => {
                        deleteInvoiceMutation.mutate(invoice.uuid);
                    },
                });
            };
            const handleDownload = async () => {
                try {
                    if (!invoice.uuid)
                        throw new Error("Invoice UUID not found");
                    const blob = await downloadB2BInvoicePdf(invoice.uuid);
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `invoice-${invoice.invoiceNumber || invoice.uuid}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    toast.success("Invoice downloaded successfully");
                }
                catch (err) {
                    console.error("Failed to download PDF:", err);
                    toast.error("Failed to download invoice");
                }
            };
            const handleCopyInvoiceLink = async () => {
                try {
                    const link = `${window.location.origin}/invoice-review/b2b?id=${invoice.uuid}`;
                    await navigator.clipboard.writeText(link);
                    toast.success("Invoice link copied to clipboard");
                }
                catch (err) {
                    console.error("Failed to copy invoice link", err);
                    toast.error("Failed to copy invoice link");
                }
            };
            const handleVoid = async () => {
                try {
                    await voidInvoiceMutation.mutateAsync(invoice.uuid);
                }
                catch (err) {
                    console.error("Failed to void invoice:", err);
                }
            };
            return (<ClientActionTooltip onCopyInvoiceLink={handleCopyInvoiceLink} onDeleteInvoice={handleDelete} onDownloadPDF={handleDownload} onVoidInvoice={handleVoid} invoiceStatus={invoice.status}/>);
        }}/>

      {checkedRows.length > 0 && (<FloatingAction selectedCount={checkedRows.length} allSelected={isAllChecked} onDeselectAll={() => setCheckedRows([])} actionButtons={<SecondaryButton text="Pay all" variant="light" buttonClassName="w-fit whitespace-nowrap rounded-xl" onClick={async () => {
                    const uuids = checkedRows.map(i => invoices[i]?.uuid).filter(Boolean) as string[];
                    if (uuids.length === 0)
                        return;
                    if (uuids.length === 1) {
                        router.push(`/invoice/detail?id=${uuids[0]}`);
                    }
                    else {
                        toast.success(`Opening first of ${uuids.length} selected invoices`);
                        router.push(`/invoice/detail?id=${uuids[0]}`);
                    }
                }}/>}/>)}
    </div>);
};
export default ClientInvoiceContainer;
