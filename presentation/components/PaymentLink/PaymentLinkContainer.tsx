import React, { useState, useMemo, useEffect } from "react";
import { Tooltip } from "react-tooltip";
import { PrimaryButton } from "../Common/PrimaryButton";
import { TabContainer } from "../Common/TabContainer";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { Table } from "../Common/Table";
import { FloatingAction } from "../Bill/FloatingAction";
import { SecondaryButton } from "../Common/SecondaryButton";
import { CustomCheckbox } from "../Common/CustomCheckbox";
import { useRouter } from "next/navigation";
import { useGetPaymentLinks, useDeletePaymentLinks, useActivatePaymentLink, useDeactivatePaymentLink, } from "@/presentation/services/api/payment-link";
import { PaymentLink, PaymentLinkStatus } from "@/presentation/types/dto/payment-link";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import toast from "react-hot-toast";
import { PaymentLinkActionsTooltip } from "./PaymentLinkActionsTooltip";
import { Badge, BadgeStatus } from "../Common/Badge";
import { useAuth } from "@/presentation/services/auth/context";
import { trackEvent } from "@/presentation/services/analytics/posthog";
import { PostHogEvent } from "@/presentation/types/posthog";
import { getAppUrl } from "@/presentation/services/utils/getAppUrl";
import { useDemo } from "@/presentation/contexts/DemoProvider";
const tabs = [
    { id: "all", label: "All links", title: "All payment links", description: "Share these links for payments." },
    { id: "active", label: "Active", title: "Active links", description: "Share these links for payments." },
    {
        id: "deactivated",
        label: "Deactivated",
        title: "Deactivated links",
        description: "This link is no longer active. Generate a new link.",
    },
];
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
const PaymentLinkContainer = () => {
    const router = useRouter();
    const { setTitle, setShowBackArrow } = useTitle();
    const { user } = useAuth();
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const [activeTab, setActiveTab] = useState(tabs[0]);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
    const { data: paymentLinks = [], isLoading, error } = useGetPaymentLinks();
    const { data: demoData } = useDemo();
    const deletePaymentLinksMutation = useDeletePaymentLinks();
    const activatePaymentLinkMutation = useActivatePaymentLink();
    const deactivatePaymentLinkMutation = useDeactivatePaymentLink();
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => setActiveTab(tabs[0])} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Payment Link
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">{activeTab.label}</span>
      </div>);
        setShowBackArrow(false);
    }, [activeTab.id]);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("[data-tooltip-id]") && !target.closest(".tooltip-content")) {
                setActiveTooltipId(null);
            }
        };
        if (activeTooltipId) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeTooltipId]);
    const { allLinks, activeLinks, inactiveLinks } = useMemo(() => {
        const sortedLinks = [...paymentLinks].sort((a, b) => a.order - b.order);
        const active = sortedLinks.filter(link => link.status === PaymentLinkStatus.ACTIVE);
        const inactive = sortedLinks.filter(link => link.status === PaymentLinkStatus.DEACTIVATED);
        return {
            allLinks: sortedLinks,
            activeLinks: active,
            inactiveLinks: inactive,
        };
    }, [paymentLinks]);
    const handleSelectRow = (index: number) => {
        setSelectedRows(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
    };
    const displayedLinks = useMemo(() => {
        if (activeTab.id === "active")
            return activeLinks;
        if (activeTab.id === "deactivated")
            return inactiveLinks;
        return allLinks;
    }, [activeTab.id, activeLinks, inactiveLinks, allLinks]);
    const handleCheckAll = () => {
        if (selectedRows.length === displayedLinks.length) {
            setSelectedRows([]);
        }
        else {
            setSelectedRows(displayedLinks.map((_, index) => index));
        }
    };
    const isAllChecked = displayedLinks.length > 0 && selectedRows.length === displayedLinks.length;
    const handleEdit = (linkIndex: number) => {
        const link = displayedLinks[linkIndex];
        if (link) {
            router.push(`/payment-link/edit?code=${link.code}`);
            setActiveTooltipId(null);
        }
    };
    const handleToggleStatus = (linkIndex: number, isActive: boolean) => {
        const link = displayedLinks[linkIndex];
        if (link) {
            const mutation = isActive ? activatePaymentLinkMutation : deactivatePaymentLinkMutation;
            mutation.mutate(link.code, {
                onSuccess: () => {
                    toast.success(`Payment link ${isActive ? "activated" : "deactivated"} successfully`);
                    trackEvent(PostHogEvent.PAYMENT_LINK_TOGGLED, { active: isActive });
                    setActiveTooltipId(null);
                },
                onError: (error: any) => {
                    toast.error(error?.message || `Failed to ${isActive ? "activate" : "deactivate"} payment link`);
                },
            });
        }
    };
    const handleRemove = async (linkIndex: number) => {
        const link = displayedLinks[linkIndex];
        if (!link) {
            toast.error("Payment link not found");
            return;
        }
        try {
            const response = await deletePaymentLinksMutation.mutateAsync([link.code]);
            trackEvent(PostHogEvent.PAYMENT_LINK_DELETED);
            toast.success(response.message || "Payment link deleted successfully");
        }
        catch (error: any) {
            toast.error(error?.message || "Failed to delete payment link");
        }
    };
    const handleBulkDelete = async () => {
        if (selectedRows.length === 0) {
            toast.error("No payment links selected");
            return;
        }
        const codesToDelete = selectedRows.map(index => displayedLinks[index].code);
        try {
            const response = await deletePaymentLinksMutation.mutateAsync(codesToDelete);
            toast.success(response.message || `${response.deletedCount} payment link(s) deleted successfully`);
            setSelectedRows([]);
        }
        catch (error: any) {
            toast.error(error?.message || "Failed to delete payment links");
        }
    };
    const tableData = useMemo(() => {
        return displayedLinks.map((link: PaymentLink) => ({
            id: link.id,
            "header-0": (<div className="flex justify-center items-center" onClick={e => e.stopPropagation()}>
          <CustomCheckbox checked={selectedRows.includes(displayedLinks.indexOf(link))} onChange={() => handleSelectRow(displayedLinks.indexOf(link))}/>
        </div>),
            Title: (<div className="flex items-center gap-2">
          <span className="text-text-primary text-sm">{link.title}</span>
          <img src="/misc/copy-icon.svg" alt="copy link" className="w-4 h-4 cursor-pointer opacity-60 transition-opacity hover:opacity-100" onClick={e => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${getAppUrl()}/payment/${link.code}`);
                    toast.success("Payment link copied to clipboard");
                }}/>
        </div>),
            Currency: (<div className="flex justify-center items-center gap-1.5">
          <img src={`/token/${((link as any).currency || link.acceptedTokens?.[0]?.symbol || "usdt").toLowerCase()}.svg`} onError={(e) => { (e.target as HTMLImageElement).src = "/token/usdc.svg"; }} alt={(link as any).currency || link.acceptedTokens?.[0]?.symbol || "USDC"} className="w-5 h-5"/>
          <span className="text-text-primary text-sm leading-none">
            {(link as any).currency || link.acceptedTokens?.[0]?.symbol || "USDC"}
          </span>
        </div>),
            Amount: <span className="num text-text-primary leading-none">{link.amount ?? "Any"}</span>,
            Timestamp: new Date(link.createdAt).toLocaleString("sv-SE", { hour12: false }),
            Account: (() => {
                const recipientAddr = (link as any).recipientAddress;
                const account = demoData?.accounts.find(a => a.accountId === recipientAddr);
                return (<div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue text-[10px] font-bold flex-shrink-0">
              {account?.name?.[0] || "?"}
            </div>
            <span className="text-text-primary text-sm">{account?.name || "Unknown"}</span>
          </div>);
            })(),
            Status: (<Badge status={link.status === PaymentLinkStatus.ACTIVE ? BadgeStatus.SUCCESS : BadgeStatus.NEUTRAL} text={link.status}/>),
            " ": isAdmin ? (<div className="flex justify-center items-center">
          <div data-tooltip-id={`payment-link-actions-${displayedLinks.indexOf(link)}`} className="cursor-pointer" onClick={e => {
                    e.stopPropagation();
                    setActiveTooltipId(activeTooltipId === `payment-link-actions-${displayedLinks.indexOf(link)}`
                        ? null
                        : `payment-link-actions-${displayedLinks.indexOf(link)}`);
                }}>
            <img src="/misc/three-dot-icon.svg" alt="More" className="w-6 h-6"/>
          </div>
        </div>) : null,
        }));
    }, [displayedLinks, selectedRows, deletePaymentLinksMutation.isPending]);
    const tableHeaders = [
        <div className="flex justify-center items-center">
      <CustomCheckbox checked={isAllChecked as boolean} onChange={handleCheckAll}/>
    </div>,
        "Title",
        "Currency",
        "Amount",
        "Timestamp",
        "Account",
        "Status",
        " ",
    ];
    return (<div className="relative flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Payment Links</h1>
          <p className="text-[14px] text-text-secondary">Create and share links to get paid.</p>
        </div>
        <PrimaryButton text="Create payment link" onClick={() => router.push("/payment-link/create")} containerClassName="w-fit" buttonClassName="whitespace-nowrap"/>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <Card title="All payment links" text={<span className="num text-text-primary text-2xl leading-none">{allLinks.length}</span>}/>
        <Card title="Active links" text={<span className="num text-text-primary text-2xl leading-none">{activeLinks.length}</span>}/>
        <Card title="Deactivated links" text={<span className="num text-text-primary text-2xl leading-none">{inactiveLinks.length}</span>}/>
      </div>

      
      <div className="mt-2 flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
        <TabContainer tabs={tabs} activeTab={activeTab.id} setActiveTab={(tab: string) => setActiveTab(tabs.find(t => t.id === tab) || tabs[0])} textSize="sm"/>
        <span className="text-sm text-text-secondary">
          {displayedLinks.length} {displayedLinks.length === 1 ? "link" : "links"}
        </span>
      </div>

      
      <div className="w-full p-5">
        {isLoading ? (<div className="flex justify-center items-center h-64">
            <img src="/loading-square.gif" alt="loading" className="w-12 h-12"/>
          </div>) : error ? (<div className="flex justify-center items-center h-64">
            <span className="text-text-secondary">Failed to load payment links</span>
          </div>) : (<Table headers={tableHeaders} data={tableData} rowClassName="py-5" actionColumn={false} showFooter={false} showPagination={true} selectedRows={selectedRows} currentPage={currentPage} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage} columnWidths={{
                "0": "52px",
                "4": "180px",
                "7": "50px",
            }} onRowClick={(_, index) => {
                const link = displayedLinks[index];
                if (link) {
                    router.push(`/payment-link/detail?code=${link.code}`);
                }
            }}/>)}
      </div>

      {selectedRows.length > 0 && (<FloatingAction selectedCount={selectedRows.length} allSelected={isAllChecked} onDeselectAll={() => setSelectedRows([])} totalLabel={`Total (${selectedRows.length} ${selectedRows.length === 1 ? "link" : "links"})`} actionButtons={<SecondaryButton text={`Remove ${selectedRows.length} ${selectedRows.length === 1 ? "link" : "links"}`} variant="red" disabled={deletePaymentLinksMutation.isPending} buttonClassName="w-fit whitespace-nowrap rounded-xl" onClick={handleBulkDelete}/>}/>)}

      
      {displayedLinks.map((link, index) => (<Tooltip key={`payment-link-actions-${index}`} id={`payment-link-actions-${index}`} clickable style={{
                zIndex: 30,
                borderRadius: "16px",
                padding: "0",
            }} place="left" openOnClick noArrow border="none" opacity={1} isOpen={activeTooltipId === `payment-link-actions-${index}`} afterHide={() => setActiveTooltipId(null)} render={() => (<div className="tooltip-content">
              <PaymentLinkActionsTooltip link={link} onEdit={() => handleEdit(index)} onToggleStatus={(isActive: boolean) => handleToggleStatus(index, isActive)} onRemove={() => handleRemove(index)}/>
            </div>)}/>))}
    </div>);
};
export default PaymentLinkContainer;
