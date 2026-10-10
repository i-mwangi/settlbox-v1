"use client";
import React from "react";
import { formatUnits } from "viem";
import { formatAddress } from "@/presentation/services/utils/address";
import type { ConsumableNote } from "@/presentation/services/api/multisig";
import { USDC_TOKEN_ADDRESS, USDC_TOKEN_HEX_ADDRESS, USDC_TOKEN_SYMBOL, USDC_TOKEN_DECIMALS } from "@/presentation/services/utils/constant";
import { supportedTokens } from "@/presentation/services/utils/supportedToken";
import { PrimaryButton } from "../Common/PrimaryButton";
interface NoteRowProps {
    note: ConsumableNote;
    selected?: boolean;
    onSelect?: (noteId: string) => void;
    onClaimNote?: (noteId: string) => Promise<void>;
    isLoading?: boolean;
    isInProposal?: boolean;
    isViewer?: boolean;
}
function isSettlboxHexAddress(hexId: string): boolean {
    return hexId.toLowerCase().replace(/^0x/, "") === USDC_TOKEN_HEX_ADDRESS.toLowerCase().replace(/^0x/, "");
}
function isSettlboxBech32Address(bech32: string): boolean {
    if (!bech32)
        return false;
    const base = bech32.split("_")[0];
    const usdcBase = USDC_TOKEN_ADDRESS.split("_")[0];
    return base === usdcBase;
}
export function isSettlboxToken(faucetBech32: string, faucetHex: string, symbol: string): boolean {
    return isSettlboxHexAddress(faucetHex) || isSettlboxBech32Address(faucetBech32) || symbol.toUpperCase() === "USDC";
}
export function getTokenLogo(faucetBech32: string, faucetHex: string, symbol: string): string {
    if (isSettlboxToken(faucetBech32, faucetHex, symbol)) {
        return "/token/usdc.svg";
    }
    const known = supportedTokens.find(t => {
        const base = t.faucetId.split("_")[0];
        return faucetBech32 && faucetBech32.startsWith(base);
    });
    if (known) {
        const sym = known.symbol.toLowerCase();
        return `/token/${sym}.svg`;
    }
    return "/token/any-token.svg";
}
export function formatAmount(amount: number | string, decimals: number): string {
    try {
        const bigIntAmount = BigInt(Math.round(Number(amount)));
        return formatUnits(bigIntAmount, decimals);
    }
    catch {
        return "0";
    }
}
export function parseNoteType(noteType: string): string {
    if (!noteType)
        return "";
    const match = noteType.match(/Some\((\w+)\)/);
    return match ? match[1] : noteType;
}
export function getNoteTypeBadgeColor(noteType: string): string {
    const type = parseNoteType(noteType).toLowerCase();
    if (type.includes("public"))
        return "bg-purple-50 border-purple-200 text-purple-700";
    if (type.includes("private"))
        return "bg-blue-50 border-blue-200 text-blue-700";
    return "bg-gray-50 border-gray-200 text-gray-700";
}
export function NoteRow({ note, selected: _selected = false, onSelect, onClaimNote, isLoading = false, isInProposal = false, isViewer = false, }: NoteRowProps) {
    const firstAsset = note.assets?.[0];
    const faucetBech32 = firstAsset?.faucet_bech32 || "";
    const faucetHex = firstAsset?.faucet_id || "";
    const isSettlbox = isSettlboxToken(faucetBech32, faucetHex, firstAsset?.symbol || "");
    const symbol = isSettlbox ? USDC_TOKEN_SYMBOL : (firstAsset?.symbol || "");
    const decimals = isSettlbox ? USDC_TOKEN_DECIMALS : (firstAsset?.decimals ?? 8);
    const displayAmount = firstAsset ? formatAmount(firstAsset.amount, decimals) : "0";
    const tokenLabel = symbol || (faucetBech32 ? formatAddress(faucetBech32) : formatAddress(faucetHex));
    const tokenLogo = firstAsset ? getTokenLogo(faucetBech32, faucetHex, symbol) : "/token/any-token.svg";
    const noteTypeFormatted = parseNoteType(note.note_type);
    const noteTypeBadgeColor = getNoteTypeBadgeColor(note.note_type);
    const handleClaimClick = async () => {
        if (onClaimNote) {
            await onClaimNote(note.note_id);
        }
        else {
            onSelect?.(note.note_id);
        }
    };
    return (<div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-3 rounded-lg border-b border-primary-divider last:border-b-0 hover:bg-app-background">
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-secondary">ID</span>
        <span className="text-sm font-medium text-text-strong-950">
          {note.note_id.slice(0, 5)}...{note.note_id.slice(-6)}
        </span>
      </div>

      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-secondary">From</span>
        <span className="text-sm font-medium text-text-strong-950">
          {note.sender ? formatAddress(note.sender) : symbol ? `${symbol} Faucet` : "Unknown"}
        </span>
      </div>

      
      <div className="flex items-center justify-center">
        <img src={tokenLogo} alt={tokenLabel} className="w-6 h-6 mr-2" onError={(e) => { (e.target as HTMLImageElement).src = "/token/any-token.svg"; }}/>
        <span className="text-sm font-medium text-text-strong-950">
          {displayAmount} {tokenLabel}
        </span>
      </div>

      
      <div className="flex items-center justify-center">
        {noteTypeFormatted ? (<div className={`inline-flex items-center px-3 py-1 rounded-full border ${noteTypeBadgeColor}`}>
            <span className="text-sm font-semibold">{noteTypeFormatted}</span>
          </div>) : (<div className="inline-flex items-center px-3 py-1 rounded-full border bg-gray-50 border-gray-200 text-gray-500">
            <span className="text-sm font-semibold">Note</span>
          </div>)}
      </div>

      
      <div className="flex items-center justify-end">
        <PrimaryButton text={isInProposal ? "In Proposal" : "Claim"} onClick={handleClaimClick} loading={isLoading} disabled={isInProposal || isLoading || isViewer} buttonClassName="w-fit whitespace-nowrap"/>
      </div>
    </div>);
}
