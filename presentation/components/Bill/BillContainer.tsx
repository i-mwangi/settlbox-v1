"use client";
import { n } from "@/presentation/services/utils/normalizeToken";
import React, { useState, useEffect } from "react";
import { TabContainer } from "../Common/TabContainer";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { SecondaryButton } from "../Common/SecondaryButton";
import { Badge, BadgeStatus } from "../Common/Badge";
import { Table } from "../Common/Table";
import { CustomCheckbox } from "../Common/CustomCheckbox";
import { FloatingAction } from "./FloatingAction";
import { BillStatusEnum } from "@/presentation/types/enums";
import { useGetBills, usePayBills } from "@/presentation/services/api/bill";
import { CategoryShapeEnum } from "@/presentation/types/enums";
import { CategoryBadge } from "../ContactBook/ContactBookContainer";
import { useGetAllEmployeeGroups } from "@/presentation/services/api/employee";
import { Tooltip } from "react-tooltip";
import BillActionTooltip from "../Common/ToolTip/BillActionTooltip";
import { useDeleteBill } from "@/presentation/services/api/bill";
import { useInvoice } from "@/presentation/hooks/server/useInvoice";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { useAuth } from "@/presentation/services/auth/context";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
type Tab = "all" | "pending" | "paid";
const emptyBills: never[] = [];
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
const BillContainer = () => {
    const { setTitle, setShowBackArrow } = useTitle();
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [checkedRows, setCheckedRows] = React.useState<number[]>([]);
    const { data: groups } = useGetAllEmployeeGroups();
    const { openModal } = useModal();
    const { user } = useAuth();
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const tabLabel = activeTab === "pending" ? "Pending" : activeTab === "paid" ? "Paid" : "All";
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => setActiveTab("all")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Bills
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">{tabLabel}</span>
      </div>);
        setShowBackArrow(false);
    }, [activeTab]);
    const billActionRenderer = (rowData: Record<string, any>, index: number) => isAdmin ? (<div className="flex items-center justify-center w-full" onClick={e => e.stopPropagation()}>
        <img src="/misc/three-dot-icon.svg" alt="three dot icon" className="w-6 h-6 cursor-pointer" data-tooltip-id="bill-action-tooltip" data-tooltip-content={rowData.__billId?.toString()}/>
      </div>) : null;
    const handleCheckRow = (idx: number) => {
        const bill = bills[idx];
        if (bill?.status !== BillStatusEnum.PENDING) {
            const statusMessage = bill?.status === BillStatusEnum.PAID
                ? "This bill cannot be checked because it has already been paid" : bill?.status === BillStatusEnum.CANCELLED
                ? "This bill cannot be checked because it has been cancelled" : `This bill cannot be checked because it is ${bill?.status?.toLowerCase()}`;
            toast.error(statusMessage);
            return;
        }
        setCheckedRows(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
    };
    const handleCheckAll = () => {
        const pendingIndices = bills
            .map((bill, idx) => (bill.status === BillStatusEnum.PENDING ? idx : null))
            .filter((idx): idx is number => idx !== null);
        if (pendingIndices.length === 0) {
            toast.error("No pending bills available to check");
            return;
        }
        const allPendingChecked = pendingIndices.every(idx => checkedRows.includes(idx));
        if (allPendingChecked) {
            setCheckedRows(prev => prev.filter(idx => !pendingIndices.includes(idx)));
        }
        else {
            setCheckedRows(prev => {
                const nonPendingChecked = prev.filter(idx => bills[idx]?.status !== BillStatusEnum.PENDING);
                return [...nonPendingChecked, ...pendingIndices];
            });
        }
    };
    const { data: billsResponse, isLoading } = useGetBills({
        page: currentPage,
        limit: rowsPerPage,
        status: activeTab === "all" ? undefined : activeTab === "pending" ? BillStatusEnum.PENDING : BillStatusEnum.PAID,
    });
    const bills = billsResponse?.bills ?? emptyBills;
    const billsKey = bills.map(b => `${b.id}:${b.status}`).join(",");
    useEffect(() => {
        setCheckedRows(prev => {
            const filtered = prev.filter(idx => bills[idx]?.status === BillStatusEnum.PENDING);
            return filtered.length === prev.length ? prev : filtered;
        });
    }, [billsKey]);
    const payBillsMutation = usePayBills();
    const deleteBill = useDeleteBill();
    const { downloadPdf, cancelInvoiceData } = useInvoice();
    const router = useRouter();
    const billDatas = bills.map((b, idx) => {
        const createdDate = b.createdAt
            ? new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "";
        const dueDate = b.invoice?.dueDate
            ? new Date(b.invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "";
        const badgeStatus = (() => {
            switch (b.status) {
                case "PAID":
                    return BadgeStatus.SUCCESS;
                case "PENDING":
                    return BadgeStatus.AWAITING;
                case "OVERDUE":
                    return BadgeStatus.FAIL;
                default:
                    return BadgeStatus.NEUTRAL;
            }
        })();
        return {
            __id: b.invoice?.uuid,
            __billId: b.id,
            __invoiceUuid: b.invoice?.uuid,
            __billUuid: b.uuid,
            "header-0": (<div className="flex justify-center items-center" onClick={e => e.stopPropagation()}>
          <CustomCheckbox checked={checkedRows.includes(idx)} onChange={() => handleCheckRow(idx)} disabled={b.status !== BillStatusEnum.PENDING}/>
        </div>),
            "Creation date": createdDate,
            Invoice: b.invoice?.invoiceNumber || b.uuid,
            Name: b.invoice?.fromDetails?.name || (b.invoice?.fromDetails as any).companyName,
            Group: (<div className="flex justify-center items-center">
          <CategoryBadge shape={groups?.find(grp => grp.id === b.invoice?.employee?.groupId)?.shape || CategoryShapeEnum.CIRCLE} color={groups?.find(grp => grp.id === b.invoice?.employee?.groupId)?.color || "#35ADE9"} name={groups?.find(grp => grp.id === b.invoice?.employee?.groupId)?.name || "Client"}/>
        </div>),
            Amount: (<div className="flex items-center gap-2 justify-center">
          <span>{b.invoice?.total || "0"}</span>
          
          <div className="flex items-center gap-2">{n(b.invoice?.paymentToken?.name)}</div>
          
        </div>),
            "Due Date": dueDate,
            Status: (<div className="w-full flex justify-center items-center">
          <Badge text={b.status} status={badgeStatus}/>
        </div>),
        };
    });
    const pendingBillsCount = bills.filter(b => b.status === BillStatusEnum.PENDING).length;
    const checkedPendingCount = checkedRows.filter(idx => bills[idx]?.status === BillStatusEnum.PENDING).length;
    const isAllChecked = pendingBillsCount > 0 && checkedPendingCount === pendingBillsCount;
    const allBillsCount = bills.length;
    const paidBillsCount = bills.filter(b => b.status === BillStatusEnum.PAID).length;
    const overdueBillsCount = bills.filter(b => b.status === BillStatusEnum.OVERDUE).length;
    return (<div className="relative flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Bills</h1>
          <p className="text-[14px] text-text-secondary">
            Manage all the invoices you received from vendors, clients and employees.
          </p>
        </div>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <Card title="All bills" text={<span className="num text-text-primary text-2xl leading-none">{allBillsCount}</span>}/>
        <Card title="Pending" text={<span className="num text-text-primary text-2xl leading-none">{pendingBillsCount}</span>}/>
        <Card title="Paid" text={<span className="num text-text-primary text-2xl leading-none">{paidBillsCount}</span>}/>
        <Card title="Overdue" text={<span className="num text-text-primary text-2xl leading-none">{overdueBillsCount}</span>}/>
      </div>

      
      <div className="mt-2 flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
        <TabContainer tabs={[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "paid", label: "Paid" },
        ]} activeTab={activeTab} setActiveTab={setActiveTab} textSize="sm"/>
        <span className="text-sm text-text-secondary">{bills.length} bills</span>
      </div>

      
      <div className="w-full p-5">
        <Table headers={[
            <div className="flex justify-center items-center">
              <CustomCheckbox checked={isAllChecked as boolean} onChange={handleCheckAll}/>
            </div>,
            "Creation date",
            "Invoice",
            "Name",
            "Group",
            "Amount",
            "Due Date",
            "Status",
        ]} data={billDatas} className="w-full" rowClassName="py-5" headerClassName="py-3" showFooter={false} showPagination={true} actionColumn={true} actionRenderer={billActionRenderer} currentPage={currentPage} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage} onRowClick={rowData => {
            const invoiceUUID = (rowData as any).__invoiceUuid;
            const billUUID = (rowData as any).__billUuid;
            router.push(`/bill/detail?uuid=${invoiceUUID}&billUuid=${billUUID}`);
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
            const bill = bills?.find(b => b.id === id);
            if (!bill)
                return null;
            const handlePay = async () => {
                const selectedUUIDs = checkedRows.map(i => bills[i]?.invoice?.uuid).filter(Boolean) as string[];
                const uuids = Array.from(new Set([bill.invoice?.uuid, ...selectedUUIDs])).filter(Boolean) as string[];
                if (uuids.length === 0)
                    return;
                openModal("PAY_INVOICE_CONFIRM", { invoiceUUIDs: uuids });
            };
            const handleDelete = () => {
                openModal("REMOVE_INVOICE", {
                    invoiceOwnerName: bill.invoice?.fromDetails?.name || "",
                    onRemove: async () => {
                        await cancelInvoiceData(bill.invoice?.uuid || "");
                        trackEvent(PostHogEvent.BILL_CANCELLED, { billId: String(bill.id) });
                        toast.success("Invoice cancelled successfully");
                    },
                });
            };
            const handleDownload = async () => {
                try {
                    if (!bill.invoice?.uuid)
                        throw new Error("Invoice UUID not found");
                    const blob = await downloadPdf(bill.invoice?.uuid);
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `invoice-${bill.invoice?.invoiceNumber || bill.uuid}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }
                catch (err) {
                    console.error("Failed to download PDF:", err);
                }
            };
            const handleCopyInvoiceLink = async () => {
                try {
                    const link = `${window.location.origin}/invoice-review?invoiceUUID=${bill.uuid}`;
                    await navigator.clipboard.writeText(link);
                    toast.success("Invoice link copied to clipboard");
                }
                catch (err) {
                    console.error("Failed to copy invoice link", err);
                }
            };
            return (<BillActionTooltip onCopyInvoiceLink={handleCopyInvoiceLink} onDeleteInvoice={handleDelete} onDownloadPDF={handleDownload} onPay={handlePay} billStatus={bill.status}/>);
        }}/>

      {checkedRows.length > 0 && (<FloatingAction selectedCount={checkedRows.length} allSelected={isAllChecked} onDeselectAll={() => setCheckedRows([])} actionButtons={<SecondaryButton text="Pay all" variant="light" buttonClassName="w-fit whitespace-nowrap rounded-xl" onClick={() => {
                    const uuids = checkedRows.map(i => bills[i]?.invoice?.uuid).filter(Boolean) as string[];
                    if (uuids.length === 0)
                        return;
                    openModal("PAY_INVOICE_CONFIRM", { invoiceUUIDs: uuids });
                }}/>}/>)}
    </div>);
};
export default BillContainer;
