"use client";
import React, { useMemo } from "react";
import { formatNumberWithCommas } from "@/presentation/services/utils/formatNumber";
import { useBalanceVisibility } from "@/presentation/contexts/BalanceVisibilityProvider";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useListAccountsByCompany, useLocalAccountBalances } from "@/presentation/services/api/multisig";
export function WalletHeader({ onClose, onChooseAccount }: {
    onClose: () => void;
    onChooseAccount: () => void;
}) {
    const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibility();
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts } = useListAccountsByCompany(myCompany?.id, { enabled: !!myCompany?.id });
    const accountIds = useMemo(() => multisigAccounts?.map(a => a.accountId) || [], [multisigAccounts]);
    const { data: localBalances, isLoading: balancesLoading } = useLocalAccountBalances(accountIds, {
        enabled: accountIds.length > 0,
    });
    const totalUsd = localBalances?.totalBalance ?? 0;
    return (<header className="flex relative flex-col gap-4 items-start w-full p-2  rounded-2xl">
      
      <div className="flex gap-2 items-center justify-between w-full">
        <div className="flex gap-2 items-center rounded-full bg-background px-2 py-1 cursor-pointer" onClick={onChooseAccount}>
          <img src="/portfolio/account-icon.svg" alt="wallet icon" className="w-5"/>
          <div className=" leading-none text-text-primary">Account 1</div>
          <img src="/arrow/chevron-down.svg" alt="wallet icon" className="w-4"/>
        </div>
        <div className="flex gap-3 items-center">
          
          <div className="w-[1px] h-5 bg-text-secondary rotate-180"/>
          <img src="/misc/close-icon.svg" alt="close" className="w-5 h-5 opacity-50 cursor-pointer" onClick={onClose}/>
        </div>
      </div>
      
      <section className="flex relative flex-col gap-1 items-start self-stretch z-[1]">
        <div className="flex gap-2 items-center self-stretch">
          <h1 className="text-base font-medium leading-6 text-center text-text-secondary">Total balance</h1>
          <button className="cursor-pointer" onClick={toggleBalanceVisibility} aria-label="Toggle balance visibility">
            <img src={isBalanceVisible ? "/portfolio/eye-icon.svg" : "/portfolio/eye-icon-closed.svg"} alt={isBalanceVisible ? "hide balance" : "show balance"} className="w-5 h-5"/>
          </button>
        </div>

        <div className={`flex gap-2 items-center self-stretch ${isBalanceVisible ? "mb-0" : "mb-8"}`}>
          <span className="text-4xl leading-9 text-text-secondary uppercase">$</span>
          {isBalanceVisible ? (<span className="text-4xl font-bold tracking-tighter leading-9 text-text-primary uppercase">
              {formatNumberWithCommas(totalUsd)}
            </span>) : (<div className="flex gap-1 items-center">
              {[...Array(4)].map((_, index) => (<img key={index} src="/token/usdc.svg" alt="settlbox icon" className="w-8 h-8"/>))}
            </div>)}
        </div>

        
      </section>

      
      
    </header>);
}
