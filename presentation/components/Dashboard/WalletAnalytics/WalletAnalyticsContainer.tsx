"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TransactionDetail from "./TransactionDetail";
import TopInteractedAddresses from "../../Home/Overview/TopInteractedAddresses";
import SpendingAverageChart from "../../Home/Overview/SpendingAverageChart";
import GeneralStatistics from "../../Home/Overview/GeneralStatistics";
import TransactionHistory from "./TransactionHistory";
import { DemoTransaction } from "@/presentation/contexts/DemoProvider";
import { useEscapeKey } from "@/presentation/hooks/web3/useEscapeKey";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
const ANIMATION_DURATION = 300;
export const WalletAnalyticsContainer: React.FC = () => {
    const router = useRouter();
    const { setTitle, setShowBackArrow } = useTitle();
    const [selectedTransaction, setSelectedTransaction] = useState<DemoTransaction | null>(null);
    const [timePeriod, setTimePeriod] = useState<"month" | "year">("month");
    const [showTransactionDetail, setShowTransactionDetail] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => router.push("/")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Dashboard
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">Wallet analytics</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    const handleTransactionClick = (transaction: DemoTransaction) => {
        setSelectedTransaction(transaction);
        setShowTransactionDetail(true);
        setIsAnimating(true);
        const container = document.querySelector(".wallet-analytics-container");
        if (container) {
            container.scrollTop = 0;
        }
        setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
    };
    const handleBackToHistory = () => {
        setIsAnimating(true);
        setShowTransactionDetail(false);
        setTimeout(() => {
            setIsAnimating(false);
        }, ANIMATION_DURATION);
    };
    useEscapeKey(handleBackToHistory, showTransactionDetail);
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Wallet analytics</h1>
          <p className="text-[14px] text-text-secondary">
            Track your spending, top addresses and transaction history across your wallet.
          </p>
        </div>
      </div>

      
      <div className="flex flex-1 min-h-0 flex-col gap-2 px-6 pb-6">
        
        <div className="flex flex-row gap-[5px] h-[250px] items-start w-full">
          <GeneralStatistics timePeriod={timePeriod} onTimePeriodChange={setTimePeriod}/>
          <TopInteractedAddresses />
          <SpendingAverageChart />
        </div>

        
        <div className="relative w-full flex-1 min-h-0 overflow-hidden rounded-lg">
        
        <div className={`transition-transform duration-[${ANIMATION_DURATION}ms] ease-in-out h-full ${showTransactionDetail ? "-translate-x-full" : "translate-x-0"}`}>
          <div className="h-full overflow-y-auto">
            <TransactionHistory onTransactionClick={handleTransactionClick}/>
          </div>
        </div>

        
        <div className={`absolute inset-0 transition-transform duration-[${ANIMATION_DURATION}ms] ease-in-out h-full ${showTransactionDetail ? "translate-x-0" : "translate-x-full"}`}>
          {(showTransactionDetail || isAnimating) && selectedTransaction && (<div className="h-full overflow-y-auto">
              <TransactionDetail transaction={selectedTransaction} onBack={handleBackToHistory}/>
            </div>)}
        </div>
        </div>
      </div>
    </div>);
};
