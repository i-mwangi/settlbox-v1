"use client";
import React, { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { MultisigProposalResponseDto } from "@/presentation/types/dto/multisig";
import { MultisigProposalStatusEnum } from "@/presentation/types/enums";
import { useGetConsumableNotes } from "@/presentation/services/api/multisig";
import { supportedTokens } from "@/presentation/services/utils/supportedToken";
import { formatAddress } from "@/presentation/services/utils/address";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
import { getFaucetMetadata } from "@/presentation/services/utils/arc-token";
import { usePSMProvider } from "@/presentation/contexts/PSMProvider";
import { USDC_TOKEN_HEX_ADDRESS, USDC_TOKEN_SYMBOL, USDC_TOKEN_DECIMALS } from "@/presentation/services/utils/constant";
interface ProposalRowProps {
    proposal: MultisigProposalResponseDto;
    onSign?: (proposalId: number) => void;
    onExecute?: (proposalId: number) => void;
    onCancel?: (proposalUuid: string) => void;
    isSignLoading?: boolean;
    isExecuteLoading?: boolean;
    isCancelLoading?: boolean;
    userPublicKey?: string;
    isViewer?: boolean;
    onProposalClick?: (e: any) => void;
}
export const categoryConfig: Record<string, {
    label: string;
    icon: string;
}> = {
    paying_reimbursement: { label: "Paying Reimbursement", icon: "/transaction/pay-icon.svg" },
    paying_payroll: { label: "Paying Payroll", icon: "/transaction/pay-icon.svg" },
    paying_bill: { label: "Paying Bill", icon: "/transaction/pay-icon.svg" },
    deposit_card: { label: "Deposit to Card", icon: "/sidebar/credit-card.svg" },
    deposit_earn: { label: "Deposit to Earn", icon: "/sidebar/earn.svg" },
    cashout: { label: "Cashout", icon: "/sidebar/crypto-ramp.svg" },
    update_signers: { label: "Update Signers", icon: "/sidebar/setting.svg" },
    update_threshold: { label: "Update Threshold", icon: "/sidebar/setting.svg" },
};
export const statusConfig: Record<string, {
    label: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
}> = {
    [MultisigProposalStatusEnum.PENDING]: {
        label: "Pending",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-400",
        textColor: "text-yellow-700",
    },
    [MultisigProposalStatusEnum.READY]: {
        label: "Ready to Execute",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-400",
        textColor: "text-blue-700",
    },
    [MultisigProposalStatusEnum.EXECUTED]: {
        label: "Completed",
        bgColor: "bg-green-50",
        borderColor: "border-green-400",
        textColor: "text-green-700",
    },
    [MultisigProposalStatusEnum.FAILED]: {
        label: "Failed",
        bgColor: "bg-red-50",
        borderColor: "border-red-400",
        textColor: "text-red-700",
    },
    [MultisigProposalStatusEnum.CANCELLED]: {
        label: "Cancelled",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-400",
        textColor: "text-gray-700",
    },
};
export function formatDate(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
export function ProposalRow({ proposal, onSign, onExecute, onCancel, isSignLoading, isExecuteLoading, isCancelLoading, userPublicKey, isViewer, onProposalClick, }: ProposalRowProps) {
    const { client: arcClient } = useArcPayment();
    const { accountCacheMap } = usePSMProvider();
    const status = proposal.status as MultisigProposalStatusEnum;
    const config = statusConfig[status] || statusConfig[MultisigProposalStatusEnum.PENDING];
    const isPending = status === MultisigProposalStatusEnum.PENDING;
    const isReady = status === MultisigProposalStatusEnum.READY;
    const isHistory = status === MultisigProposalStatusEnum.EXECUTED ||
        status === MultisigProposalStatusEnum.FAILED ||
        status === MultisigProposalStatusEnum.CANCELLED;
    const hasUserSigned = userPublicKey
        ? proposal.signatures?.some(sig => sig.approverPublicKey.toLowerCase().replace(/^0x/, "") === userPublicKey.toLowerCase().replace(/^0x/, ""))
        : false;
    const billCount = proposal.bills?.length || 0;
    const totalAmount = proposal.amount
        ? `${proposal.amount}`
        : proposal.bills?.reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0) || 0;
    const isHistoryProposal = status === MultisigProposalStatusEnum.EXECUTED ||
        status === MultisigProposalStatusEnum.FAILED ||
        status === MultisigProposalStatusEnum.CANCELLED;
    const { data: consumableNotesData = { notes: [] } } = useGetConsumableNotes(proposal.accountId, {
        enabled: proposal.proposalType === "CONSUME" && !isHistoryProposal,
    });
    const proposalNote = proposal.proposalType === "CONSUME" && proposal.noteIds?.length
        ? consumableNotesData.notes.find(note => proposal.noteIds?.includes(note.note_id))
        : null;
    const faucetId = proposal.tokens?.[0]?.address || "";
    const token = proposal.tokens?.[0];
    const [faucetMeta, setFaucetMeta] = useState<{
        symbol: string;
        decimals: number;
    } | null>(null);
    const accountKey = proposal.accountId
        ? (proposal.accountId.toLowerCase().startsWith("0x") ? proposal.accountId.toLowerCase() : `0x${proposal.accountId}`.toLowerCase())
        : "";
    const accountCache = accountKey ? accountCacheMap.get(accountKey) : undefined;
    const enrichedMatch = accountCache?.enrichedBalances.find(eb => eb.faucetId.toLowerCase() === faucetId.toLowerCase());
    const knownToken = enrichedMatch
        ? supportedTokens.find(t => enrichedMatch.faucetBech32.startsWith(t.faucetId.split("_")[0]))
        : undefined;
    useEffect(() => {
        if (!arcClient || !faucetId || enrichedMatch?.symbol)
            return;
        let cancelled = false;
        getFaucetMetadata(arcClient, faucetId)
            .then(meta => {
            if (!cancelled)
                setFaucetMeta(meta);
        })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [arcClient, faucetId, enrichedMatch?.symbol]);
    const isSettlboxByHex = faucetId.toLowerCase().replace(/^0x/, "") === USDC_TOKEN_HEX_ADDRESS.toLowerCase().replace(/^0x/, "");
    const isHexLike = (s: string) => /^0x[0-9a-fA-F]+$/.test(s);
    const sanitizedTokenSymbol = token?.symbol && !isHexLike(token.symbol) ? token.symbol : "";
    const resolvedSymbol = isSettlboxByHex
        ? USDC_TOKEN_SYMBOL
        : enrichedMatch?.symbol || faucetMeta?.symbol || sanitizedTokenSymbol || "";
    const tokenIsSettlbox = isSettlboxByHex || resolvedSymbol.toUpperCase() === "USDC";
    const matchedSupportedToken = resolvedSymbol
        ? supportedTokens.find(t => t.symbol.toUpperCase() === resolvedSymbol.toUpperCase())
        : undefined;
    const tokenSymbol = matchedSupportedToken?.symbol || resolvedSymbol;
    const tokenDecimals = token?.decimals ?? enrichedMatch?.decimals ?? faucetMeta?.decimals ?? matchedSupportedToken?.decimals ?? (isSettlboxByHex ? USDC_TOKEN_DECIMALS : 0);
    const tokenLogo = tokenIsSettlbox
        ? "/token/usdc.svg" : knownToken
        ? `/token/${knownToken.symbol.toLowerCase()}.svg`
        : matchedSupportedToken
            ? `/token/${matchedSupportedToken.symbol.toLowerCase()}.svg`
            : "/token/any-token.svg";
    const displayAmount = token?.amount
        ? (() => {
            try {
                return formatUnits(BigInt(token.amount), tokenDecimals);
            }
            catch {
                return "-";
            }
        })()
        : "-";
    return (<div className="grid grid-cols-[180px_1fr_150px_120px_180px_180px] gap-4 items-center px-4 py-3 rounded-lg border-b border-primary-divider last:border-b-0 hover:bg-app-background cursor-pointer" onClick={onProposalClick}>
      
      <div className="flex items-center gap-3 justify-start">
        {(() => {
            const cat = (proposal as any).proposalCategory;
            const catConfig = cat ? categoryConfig[cat] : undefined;
            const icon = catConfig?.icon || (proposal.proposalType === "SEND" ? "/transaction/pay-icon.svg" : "/transaction/consume-icon.svg");
            const label = catConfig?.label || (proposal.proposalType === "SEND" ? "Pay" : "Receive");
            return (<>
              <img src={icon} alt={label} className="w-6 h-6"/>
              <span className="text-sm font-medium text-text-primary whitespace-nowrap">{label}</span>
            </>);
        })()}
      </div>

      
      <div className="flex items-center gap-2 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{proposal.description}</p>
      </div>

      
      <div className="flex items-center justify-start">
        {proposal.proposalType === "CONFIG" || (!token && displayAmount === "-") ? (<span className="text-sm text-text-secondary">N/A</span>) : (<div className="flex items-center justify-start gap-2">
            <img src={tokenLogo} alt={tokenSymbol || "Token"} className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).src = "/token/any-token.svg"; }}/>
            <span className="text-sm font-medium text-text-primary">
              {displayAmount} {tokenSymbol || formatAddress(faucetId)}
            </span>
          </div>)}
      </div>

      
      <div className="flex items-center justify-start">
        <div className={`inline-flex items-center justify-center px-4 py-1 rounded-full border ${config.borderColor} ${config.bgColor}`}>
          <span className={`text-sm font-semibold ${config.textColor}`}>
            {isHistory ? config.label : `${proposal.signaturesCount ?? proposal.signatures?.length ?? 0} of ${proposal.threshold ?? (proposal as any).requiredSignatures ?? "?"}`}
          </span>
        </div>
      </div>

      
      <div className="flex items-center justify-start">
        <p className="text-sm font-medium text-text-secondary whitespace-nowrap">{formatDate(proposal.createdAt)}</p>
      </div>

      
      <div className="flex items-center justify-end gap-2">
        {isPending && (<>
            <SecondaryButton text="Cancel" variant="dark" buttonClassName="w-fit whitespace-nowrap" onClick={(e: any) => {
                e.stopPropagation();
                onCancel?.(proposal.uuid);
            }} loading={isCancelLoading} disabled={isCancelLoading || isSignLoading || isViewer}/>
            <PrimaryButton text={hasUserSigned ? "Signed" : "Sign"} buttonClassName="w-fit whitespace-nowrap" onClick={(e: any) => {
                e.stopPropagation();
                onSign?.(proposal.id);
            }} loading={isSignLoading} disabled={hasUserSigned || isSignLoading || isCancelLoading || isViewer}/>
          </>)}
        {isReady && (<PrimaryButton text="Execute" buttonClassName="w-fit whitespace-nowrap" onClick={(e: any) => {
                e.stopPropagation();
                onExecute?.(proposal.id);
            }} loading={isExecuteLoading} disabled={isExecuteLoading || isViewer}/>)}
        {isHistory && (<span className={`text-sm font-medium ${config.textColor} whitespace-nowrap`}>{config.label}</span>)}
      </div>
    </div>);
}
