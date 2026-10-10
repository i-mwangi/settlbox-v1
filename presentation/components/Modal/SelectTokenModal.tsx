"use client";
import React, { useState } from "react";
import { TokenList } from "../Common/TokenList";
import { SelectTokenModalProps } from "@/presentation/types/modal";
import { ModalProp } from "@/presentation/contexts/ModalManagerProvider";
import BaseModal from "./BaseModal";
import { AssetWithMetadata } from "@/presentation/types/faucet";
import { ModalHeader } from "../Common/ModalHeader";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
const DEMO_TOKENS = [
    { symbol: "USDC", name: "Tether USD", icon: "/token/usdc.svg", decimals: 6 },
    { symbol: "USDC", name: "USD Coin", icon: "/token/usdc.svg", decimals: 6 },
    { symbol: "ETH", name: "Ethereum", icon: "/chain/ethereum.svg", decimals: 18 },
    { symbol: "SOL", name: "Solana", icon: "/chain/solana.svg", decimals: 9 },
    { symbol: "BNB", name: "BNB", icon: "/chain/bnb.svg", decimals: 18 },
    { symbol: "DAI", name: "Dai Stablecoin", icon: "/token/any-token.svg", decimals: 18 },
    { symbol: "WBTC", name: "Wrapped Bitcoin", icon: "/token/any-token.svg", decimals: 8 },
    { symbol: "MATIC", name: "Polygon", icon: "/token/any-token.svg", decimals: 18 },
];
export function SelectTokenModal({ isOpen, onClose, onTokenSelect, zIndex, }: ModalProp<SelectTokenModalProps> & {
    zIndex?: number;
}) {
    const { address, balances } = useArcPayment();
    const [searchQuery, setSearchQuery] = useState("");
    const handleTokenSelect = (token: AssetWithMetadata | null) => {
        onTokenSelect?.(token);
        onClose();
    };
    const hasRealBalances = balances?.balances && balances.balances.length > 0;
    const filteredDemoTokens = DEMO_TOKENS.filter(t => !searchQuery || t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!isOpen)
        return null;
    return (<BaseModal isOpen={isOpen} onClose={onClose} zIndex={zIndex}>
      <ModalHeader title="Select token" onClose={onClose}/>
      <main className="flex flex-col gap-3 items-start p-4 w-[450px] border-2 border-primary-divider rounded-b-2xl min-h-[300px] max-h-[500px] overflow-y-auto bg-background">
        <div className="bg-app-background border border-primary-divider flex flex-row gap-2 items-center pr-1 pl-3 py-1 rounded-lg w-full">
          <div className="flex flex-row gap-2 flex-1">
            <input type="text" placeholder="Search token" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="font-medium text-sm text-text-secondary bg-transparent border-none outline-none w-full"/>
          </div>
          <button type="submit" className="flex flex-row gap-1.5 items-center rounded-lg w-6 h-6 justify-center cursor-pointer">
            <img src="/wallet-analytics/finder.svg" alt="search" className="w-4 h-4"/>
          </button>
        </div>

        {hasRealBalances ? (<TokenList balances={balances.balances} onTokenSelect={handleTokenSelect} searchQuery={searchQuery}/>) : (<div className="flex flex-col gap-1 w-full">
            {filteredDemoTokens.map(t => (<button key={t.symbol} onClick={() => handleTokenSelect({
                    faucetId: t.symbol.toLowerCase(),
                    amount: "0",
                    metadata: { symbol: t.symbol, decimals: t.decimals, maxSupply: 0 },
                })} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-app-background transition-colors cursor-pointer w-full">
                <img src={t.icon} alt={t.symbol} className="w-8 h-8 rounded-full"/>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-sm font-semibold text-text-primary">{t.symbol}</span>
                  <span className="text-xs text-text-secondary">{t.name}</span>
                </div>
              </button>))}
          </div>)}
      </main>
    </BaseModal>);
}
export default SelectTokenModal;
