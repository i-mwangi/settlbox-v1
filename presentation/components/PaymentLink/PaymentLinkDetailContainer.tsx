import React, { useState, useMemo, useEffect } from "react";
import { PrimaryButton } from "../Common/PrimaryButton";
import { Table } from "../Common/Table";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetPaymentLinkByCodeForOwner } from "@/presentation/services/api/payment-link";
import { PaymentLinkStatus } from "@/presentation/types/dto/payment-link";
import { blo } from "blo";
import { identiconSeed } from "@/services/arc/identicon";
import toast from "react-hot-toast";
import { SecondaryButton } from "../Common/SecondaryButton";
import { Badge, BadgeStatus } from "../Common/Badge";
import { formatAddress } from "@/presentation/services/utils/address";
import { ViewOnExplorerTooltip } from "./ViewOnExplorerTooltip";
import { Tooltip } from "react-tooltip";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { getAppUrl } from "@/presentation/services/utils/getAppUrl";
import { Copy, NavArrowRight } from "iconoir-react";
const Card = ({ title, text }: {
    title: string;
    text: React.ReactNode;
}) => {
    return (<div className="relative w-full h-full rounded-xl border border-primary-divider p-5 flex flex-col overflow-hidden gap-3" style={{
            backgroundImage: `url(/card/background.svg)`,
            backgroundSize: "30%",
            backgroundPosition: "right",
            backgroundRepeat: "no-repeat",
        }}>
      <span className="text-text-secondary text-sm leading-none">{title}</span>
      {text}
    </div>);
};
const PaymentLinkDetailContainer = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const paymentLinkCode = searchParams.get("code");
    const { data: paymentLink, isLoading, error } = useGetPaymentLinkByCodeForOwner(paymentLinkCode || "");
    const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
    const { setTitle, setShowBackArrow, setOnBackClick } = useTitle();
    const goToPaymentLinks = () => { window.location.href = "/payment-link"; };
    useEffect(() => {
        if (paymentLink) {
            setTitle(<div className="flex items-center gap-1.5 text-[14px]">
          <button type="button" onClick={() => router.push("/payment-link")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
            Payment Link
          </button>
          <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
          <span className="font-medium text-text-primary">{paymentLink.title}</span>
        </div>);
            setShowBackArrow(false);
            setOnBackClick(undefined);
        }
    }, [paymentLink]);
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
    const handleCopyLink = () => {
        if (!paymentLink)
            return;
        const url = `${getAppUrl()}/payment/${paymentLink.code}`;
        navigator.clipboard.writeText(url);
        toast.success("Payment link copied to clipboard");
    };
    const tableData = useMemo(() => {
        if (!paymentLink?.records)
            return [];
        return paymentLink.records.map(record => ({
            "header-0": (<div className="flex justify-center items-center">
          <span className="text-text-primary">
            {new Date(record.createdAt).toLocaleString("sv-SE", { hour12: false })}
          </span>
        </div>),
            Amount: (<div className="flex justify-center items-center gap-1">
          <span className="text-text-primary leading-none">{paymentLink.amount}</span>
          {paymentLink.acceptedTokens?.[0] && (<img src={`/token/${paymentLink.acceptedTokens[0].symbol.toLowerCase()}.svg`} onError={(e) => { (e.target as HTMLImageElement).src = blo(identiconSeed(paymentLink.acceptedTokens[0].address)); }} alt={paymentLink.acceptedTokens[0].symbol} className="w-4 h-4"/>)}
        </div>),
            Status: (<div className="flex justify-center items-center">
          <Badge status={record.txid ? BadgeStatus.SUCCESS : BadgeStatus.NEUTRAL} text={record.txid ? "Succeed" : "Pending"} className="!py-1.5 w-fit px-5"/>
        </div>),
            From: (<div className="flex items-center gap-2 justify-center">
          <span className="text-text-primary">{record.payerName || formatAddress(record.payer)}</span>
          <img src="/misc/copy-icon.svg" alt="copy" className="w-4 h-4 cursor-pointer" onClick={() => {
                    navigator.clipboard.writeText(record.payer || "");
                    toast.success("Copied to clipboard");
                }}/>
        </div>),
            Method: (<div className="flex items-center gap-1.5 justify-center">
          <img src={record.paymentMethod === "card" ? "/misc/credit-card-icon.svg" : "/misc/crypto-icon.svg"} alt={record.paymentMethod} className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}/>
          <span className="text-text-primary text-sm">
            {record.paymentMethod === "card" ? "Card" : "Crypto"}
          </span>
        </div>),
            "Transaction Hash": record.txid ? (<div className="flex items-center gap-2 justify-center">
          <span className="text-text-primary">
            {record.txid.slice(0, 8)}...{record.txid.slice(-8)}
          </span>
          <img src="/misc/copy-icon.svg" alt="copy" className="w-4 h-4 cursor-pointer" onClick={() => {
                    navigator.clipboard.writeText(record.txid || "");
                    toast.success("Copied to clipboard");
                }}/>
        </div>) : (<span className="text-text-secondary text-sm">-</span>),
            " ": (<div className="flex justify-center items-center">
          <div data-tooltip-id={`payment-explorer-${record.id}`} className="cursor-pointer" onClick={e => {
                    e.stopPropagation();
                    setActiveTooltipId(activeTooltipId === `payment-explorer-${record.id}` ? null : `payment-explorer-${record.id}`);
                }}>
            <img src="/misc/three-dot-icon.svg" alt="More" className="w-6 h-6"/>
          </div>
        </div>),
        }));
    }, [paymentLink]);
    if (isLoading) {
        return (<div className="flex flex-col w-full h-full p-4 items-center justify-center gap-4">
        <img src="/loading-square.gif" alt="Loading" className="w-8 h-8"/>
        <p className="text-text-secondary">Loading payment link...</p>
      </div>);
    }
    if (error || !paymentLink || !paymentLinkCode) {
        return (<div className="flex flex-col w-full h-full p-4 items-center justify-center gap-4">
        <img src="/misc/red-circle-warning.svg" alt="Error" className="w-8 h-8"/>
        <p className="text-text-secondary">Failed to load payment link</p>
        <button onClick={() => router.push("/payment-link")} className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:opacity-80">
          Back to Payment Links
        </button>
      </div>);
    }
    return (<div className="flex w-full h-full flex-col overflow-y-auto">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">{paymentLink.title}</h1>
          {paymentLink.description && <p className="text-[14px] text-text-secondary">{paymentLink.description}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <SecondaryButton text="Edit link" icon="/misc/edit-icon.svg" iconPosition="left" onClick={() => router.push(`/payment-link/edit?code=${paymentLink.code}`)} variant="light" buttonClassName="w-fit whitespace-nowrap"/>
          <PrimaryButton text="Copy link" onClick={handleCopyLink} containerClassName="w-fit" buttonClassName="whitespace-nowrap"/>
        </div>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <Card title="Link" text={<div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-text-primary">
                {getAppUrl()}/payment/{paymentLink.code}
              </span>
              <button type="button" onClick={handleCopyLink} title="Copy link" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-blue/10 text-primary-blue transition-colors hover:bg-primary-blue/15 active:scale-95">
                <Copy width={14} height={14} strokeWidth={2}/>
              </button>
            </div>}/>
        <Card title="Total Collected" text={<div className="flex flex-row gap-1 items-center">
              {paymentLink.acceptedTokens?.[0] && (<img src={`/token/${paymentLink.acceptedTokens[0].symbol.toLowerCase()}.svg`} onError={(e) => { (e.target as HTMLImageElement).src = blo(identiconSeed(paymentLink.acceptedTokens[0].address)); }} alt={paymentLink.acceptedTokens[0].symbol} className="w-5 h-5"/>)}
              <span className="num text-text-primary font-semibold">
                {paymentLink.records?.length
                ? (paymentLink.records.length * parseFloat(paymentLink.amount || "0")).toFixed(2)
                : "0"}
              </span>
            </div>}/>
        <Card title="Status" text={<Badge status={paymentLink.status === PaymentLinkStatus.ACTIVE ? BadgeStatus.SUCCESS : BadgeStatus.NEUTRAL} text={paymentLink.status} className="w-fit px-3"/>}/>
        <Card title="Created on" text={<span className="num text-text-primary leading-none">{new Date(paymentLink.createdAt).toLocaleString()}</span>}/>
      </div>

      
      <div className="flex w-full flex-col gap-3 px-6 pb-6 pt-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-semibold text-text-primary">
            {paymentLink.records?.length || 0} Payments Collected
          </span>
          <span className="text-sm text-text-secondary">See who’s sent you money through your links.</span>
        </div>

        <Table headers={[
            <div className="flex justify-center items-center">
              <span className="text-text-primary">Timestamp</span>
            </div>,
            "Amount",
            "Status",
            "From",
            "Method",
            "Transaction Hash",
            " ",
        ]} data={tableData}/>
      </div>

      
      {paymentLink.records?.map((record: any) => (<Tooltip key={`payment-explorer-${record.id}`} id={`payment-explorer-${record.id}`} clickable style={{
                zIndex: 30,
                borderRadius: "16px",
                padding: "0",
            }} place="left" openOnClick noArrow border="none" opacity={1} isOpen={activeTooltipId === `payment-explorer-${record.id}`} afterHide={() => setActiveTooltipId(null)} render={() => (<div className="tooltip-content">
              <ViewOnExplorerTooltip link={record}/>
            </div>)}/>))}
    </div>);
};
export default PaymentLinkDetailContainer;
