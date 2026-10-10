"use client";
import React, { useEffect, useState } from "react";
import { CardContainer } from "./CardContainer";
import { Overview } from "./Overview";
import { ReportsSection } from "./ReportsSection";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { TabContainer } from "../Common/TabContainer";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import TransactionHistory from "../Dashboard/WalletAnalytics/TransactionHistory";
import TransactionDetail from "../Dashboard/WalletAnalytics/TransactionDetail";
import { DemoTransaction } from "@/presentation/contexts/DemoProvider";
import { useEscapeKey } from "@/presentation/hooks/web3/useEscapeKey";
const ANIMATION_DURATION = 300;
const tabs = [
    { id: "overview", label: "Overview" },
    { id: "accounting", label: "Accounting & Reports" },
    { id: "transactions", label: "Transaction History" },
];
type TabId = "overview" | "accounting" | "transactions";
export const HomeContainer = () => {
    const { openModal } = useModal();
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [selectedTransaction, setSelectedTransaction] = useState<DemoTransaction | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const { setTitle, setShowBackArrow } = useTitle();
    const activeLabel = tabs.find(t => t.id === activeTab)?.label ?? "Overview";
    useEffect(() => {
        const id = window.setTimeout(() => {
            setTitle(<div className="flex items-center gap-1.5 text-[14px]">
          <span className="text-text-secondary">Dashboard</span>
          <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
          <span className="font-medium text-text-primary">{activeLabel}</span>
        </div>);
            setShowBackArrow(false);
        }, 0);
        return () => window.clearTimeout(id);
    }, [activeLabel, setTitle, setShowBackArrow]);
    const handleTransactionClick = (transaction: DemoTransaction) => {
        setSelectedTransaction(transaction);
        setShowDetail(true);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
    };
    const handleBackToHistory = () => {
        setIsAnimating(true);
        setShowDetail(false);
        setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
    };
    useEscapeKey(handleBackToHistory, showDetail && activeTab === "transactions");
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="w-full flex flex-col gap-4 border-b border-primary-divider px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-[14px] text-text-secondary">
            A quick overview of your treasury, payroll, and recent activity.
          </p>
        </div>

        
        <TabContainer tabs={tabs} activeTab={activeTab} setActiveTab={tab => {
            setActiveTab(tab as TabId);
            if (tab !== "transactions") {
                setShowDetail(false);
                setSelectedTransaction(null);
            }
        }} textSize="sm"/>
      </div>

      
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "overview" && (<div className="w-full flex flex-col items-start gap-4 px-6 pt-5 pb-6">
            <CardContainer />
            <Overview onCreateAccount={() => openModal("CREATE_ACCOUNT")}/>
          </div>)}

        {activeTab === "accounting" && (<div className="w-full px-6 pt-5 pb-6">
            <ReportsSection />
          </div>)}

        {activeTab === "transactions" && (<div className="relative w-full h-full overflow-hidden px-6 pt-5 pb-6">
            
            <div className={`transition-transform duration-[${ANIMATION_DURATION}ms] ease-in-out h-full ${showDetail ? "-translate-x-full" : "translate-x-0"}`}>
              <div className="h-full overflow-y-auto">
                <TransactionHistory onTransactionClick={handleTransactionClick}/>
              </div>
            </div>

            
            <div className={`absolute inset-0 transition-transform duration-[${ANIMATION_DURATION}ms] ease-in-out h-full p-5 ${showDetail ? "translate-x-0" : "translate-x-full"}`}>
              {(showDetail || isAnimating) && selectedTransaction && (<div className="h-full overflow-y-auto">
                  <TransactionDetail transaction={selectedTransaction} onBack={handleBackToHistory}/>
                </div>)}
            </div>
          </div>)}
      </div>
    </div>);
};
