"use client";
import React, { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { MultisigProposalResponseDto } from "@/presentation/types/dto/multisig";
import { MultisigProposalStatusEnum } from "@/presentation/types/enums";
import { useGetConsumableNotes } from "@/presentation/services/api/multisig";
import { supportedTokens } from "@/presentation/services/utils/supportedToken";
import { formatAddress } from "@/presentation/services/utils/address";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
import { getFaucetMetadata } from "@/presentation/services/utils/arc-token";
import { usePSMProvider } from "@/presentation/contexts/PSMProvider";
import { USDC_TOKEN_HEX_ADDRESS, USDC_TOKEN_SYMBOL, USDC_TOKEN_DECIMALS } from "@/presentation/services/utils/constant";
export function ProposalAmountCell({ proposal }: {
    proposal: MultisigProposalResponseDto;
}) {
    const { client: arcClient } = useArcPayment();
    const { accountCacheMap } = usePSMProvider();
    const status = proposal.status as MultisigProposalStatusEnum;
    const isHistoryProposal = status === MultisigProposalStatusEnum.EXECUTED ||
        status === MultisigProposalStatusEnum.FAILED ||
        status === MultisigProposalStatusEnum.CANCELLED;
    useGetConsumableNotes(proposal.accountId, {
        enabled: proposal.proposalType === "CONSUME" && !isHistoryProposal,
    });
    const faucetId = proposal.tokens?.[0]?.address || "";
    const token = proposal.tokens?.[0];
    const [faucetMeta, setFaucetMeta] = useState<{
        symbol: string;
        decimals: number;
    } | null>(null);
    const accountKey = proposal.accountId
        ? proposal.accountId.toLowerCase().startsWith("0x")
            ? proposal.accountId.toLowerCase()
            : `0x${proposal.accountId}`.toLowerCase()
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
        return () => {
            cancelled = true;
        };
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
    if (proposal.proposalType === "CONFIG" || (!token && displayAmount === "-")) {
        return <span className="text-sm text-text-secondary">N/A</span>;
    }
    return (<div className="flex items-center justify-center gap-2">
      <img src={tokenLogo} alt={tokenSymbol || "Token"} className="w-5 h-5" onError={e => {
            (e.target as HTMLImageElement).src = "/token/any-token.svg";
        }}/>
      <span className="text-sm font-medium text-text-primary whitespace-nowrap">
        {displayAmount} {tokenSymbol || formatAddress(faucetId)}
      </span>
    </div>);
}
