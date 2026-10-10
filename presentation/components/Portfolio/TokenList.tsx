"use client";
import React, { useState, useMemo } from "react";
import { blo } from "blo";
import { TokenItem } from "./TokenItem";
import { identiconSeed } from "@/services/arc/identicon";
import { TabContainer } from "../Common/TabContainer";
import { Select } from "../Common/Select";
import { FilterButton } from "../Common/FilterButton";
import { supportedTokens } from "@/presentation/services/utils/supportedToken";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useListAccountsByCompany, useMultisigAssets } from "@/presentation/services/api/multisig";
const tokenSortOptions = [
    { value: "usdc", label: "USDC", icon: "/token/usdc.svg" },
];
const networkSortOptions = [
    { value: "5042002", label: "Arc Testnet", icon: "/chain/arc.svg" },
];
const filterOptions = [
    { value: "alphabetically", label: "Alphabetically (A-Z)" },
    { value: "balance", label: "Balance ($ high-low)" },
];
const tabs = [
    { id: "tokens", label: "Token Assets" },
    { id: "nfts", label: "NFTs" },
];
export function TokenList() {
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts } = useListAccountsByCompany(myCompany?.id, { enabled: !!myCompany?.id });
    const accountIds = useMemo(() => multisigAccounts?.map(a => a.accountId) || [], [multisigAccounts]);
    const { data: balances, isLoading: balancesLoading } = useMultisigAssets(accountIds, {
        enabled: accountIds.length > 0,
    });
    const [activeTab, setActiveTab] = useState<"tokens" | "nfts">("tokens");
    return (<section className="flex flex-col gap-3 items-center self-stretch p-3 rounded-2xl bg-background flex-[1_0_0] max-sm:p-2">

      <div className="w-full">

        <span className="text-text-primary text-2xl text-center w-full">Assets</span>

      </div>

      

      <TabContainer tabs={tabs} activeTab={activeTab} setActiveTab={(tab: string) => setActiveTab(tab as "tokens" | "nfts")}/>



      

      {(() => {
            switch (activeTab) {
                case "tokens":
                    return (<>

                {balancesLoading ? (<div className="flex flex-col gap-2 justify-center items-center self-stretch flex-1">

                    <img src="/modal/coin-icon.gif" alt="No tokens" className="w-20 h-20"/>



                    <span className="text-text-secondary">Loading assets...</span>

                  </div>) : (<>

                    <div className="w-full flex justify-between items-center">

                      <div className="flex gap-2">

                        <Select label="Token" options={tokenSortOptions}/>

                        <Select label="Network" options={networkSortOptions}/>

                      </div>

                      <FilterButton options={filterOptions}/>

                    </div>

                    <div className="flex flex-col items-center self-stretch rounded-lg flex-1 justify-start">

                      {balances && balances.balances.length > 0 ? ([...balances.balances]
                                .sort((a, b) => {
                                const aSymbol = a.symbol && a.symbol !== "UNKNOWN"
                                    ? a.symbol
                                    : supportedTokens.find(t => t.faucetId === a.assetId)?.symbol || "UNKW";
                                const bSymbol = b.symbol && b.symbol !== "UNKNOWN"
                                    ? b.symbol
                                    : supportedTokens.find(t => t.faucetId === b.assetId)?.symbol || "UNKW";
                                if (aSymbol === "USDC")
                                    return -1;
                                if (bSymbol === "USDC")
                                    return 1;
                                return 0;
                            })
                                .map((asset, index: number) => {
                                const symbol = asset.symbol && asset.symbol !== "UNKNOWN"
                                    ? asset.symbol
                                    : supportedTokens.find(t => t.faucetId === asset.assetId)?.symbol || "UNKW";
                                const supportedToken = supportedTokens.find(t => t.faucetId === asset.assetId);
                                const token = {
                                    faucetId: asset.assetId,
                                    metadata: {
                                        symbol: symbol,
                                        decimals: asset.decimals || supportedToken?.decimals || 8,
                                        maxSupply: (asset as any).maxSupply || supportedToken?.maxSupply || 0,
                                    },
                                    amount: asset.balance,
                                    value: "1",
                                    icon: symbol === "USDC" ? "/token/usdc.svg" : blo(identiconSeed(asset.assetId)),
                                    chain: "Arc Testnet",
                                };
                                return <TokenItem key={index} token={token}/>;
                            })) : (<div className="h-full flex flex-col items-center justify-center gap-2">

                          <img src="/modal/coin-icon.gif" alt="No tokens" className="w-20 h-20"/>



                          <span className="text-text-secondary">No assets</span>

                        </div>)}

                    </div>

                  </>)}

              </>);
                case "nfts":
                    return (<div className="flex flex-col gap-2 justify-center items-center self-stretch flex-1 text-white opacity-50">

                <img src="/modal/coin-icon.gif" alt="No tokens" className="w-20 h-20"/>

                <p>No NFTs</p>

              </div>);
                default:
                    return null;
            }
        })()}

    </section>);
}
