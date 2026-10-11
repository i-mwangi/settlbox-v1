"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { PrimaryButton } from "@/presentation/components/Common/PrimaryButton";
import { SecondaryButton } from "@/presentation/components/Common/SecondaryButton";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";
import { TabContainer } from "@/presentation/components/Common/TabContainer";
import { Table } from "@/presentation/components/Common/Table";
import { ModalHeader } from "@/presentation/components/Common/ModalHeader";
import BaseModal from "@/presentation/components/Modal/BaseModal";
import InputFilled from "@/presentation/components/Common/Input/InputFilled";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, } from "recharts";
import toast from "react-hot-toast";
import { useYieldHistory } from "@/presentation/services/api/provider-history";
function fmtUsd(n: number): string {
    return n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
function StatCard({ title, text }: {
    title: string;
    text: React.ReactNode;
}) {
    return (<div className="relative w-full h-full rounded-xl border border-primary-divider p-4 flex flex-col overflow-hidden gap-3" style={{
            backgroundImage: "url(/card/background.svg)",
            backgroundSize: "30%",
            backgroundPosition: "right",
            backgroundRepeat: "no-repeat",
        }}>
      <span className="text-text-secondary text-sm leading-none">{title}</span>
      {text}
    </div>);
}
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length)
        return null;
    return (<div className="bg-background border border-primary-divider rounded-[8px] px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      <p style={{ color: "var(--badge-success-text)" }}>Earned: {fmtUsd(payload[0].value)}</p>
    </div>);
}
function HowItWorksModal({ isOpen, onClose }: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const { EARN_APY, TVL } = useYieldHistory();
    return (<BaseModal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="How Settlbox Earn Works" onClose={onClose} icon="/sidebar/earn.svg"/>
      <div className="flex flex-col w-[520px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-5">
        <div className="grid grid-cols-1 gap-4">
          {[
            {
                step: "1",
                title: "Deposit idle funds",
                desc: "USYC subscriptions require an entitled reserve wallet and an approved investment workflow.",
            },
            {
                step: "2",
                title: "Earn T-Bill backed yield",
                desc: "USYC reserve value follows provider pricing. Historical APY is not a guaranteed current return.",
            },
            {
                step: "3",
                title: "Withdraw anytime",
                desc: "Redemption depends on wallet permissions, provider limits, available liquidity and applicable fees.",
            },
        ].map(({ step, title, desc }) => (<div key={step} className="flex items-start gap-3 bg-app-background rounded-xl p-4">
              <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "var(--primary-button)" }}>
                {step}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-text-primary">{title}</span>
                <span className="text-xs text-text-secondary leading-relaxed">{desc}</span>
              </div>
            </div>))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-app-background rounded-lg px-3 py-2 flex flex-col gap-1">
            <span className="text-xs text-text-secondary">TVL</span>
            <span className="text-base font-semibold text-text-primary">{fmtUsd(TVL)}</span>
          </div>
          <div className="flex-1 bg-app-background rounded-lg px-3 py-2 flex flex-col gap-1">
            <span className="text-xs text-text-secondary">Backing</span>
            <span className="text-base font-semibold text-text-primary">US T-Bills</span>
          </div>
        </div>

        <SecondaryButton text="Got it" onClick={onClose} variant="light" buttonClassName="w-full"/>
      </div>
    </BaseModal>);
}
function DepositModal({ isOpen, onClose, accounts, }: {
    isOpen: boolean;
    onClose: () => void;
    accounts: {
        accountId: string;
        name: string;
    }[];
}) {
    const { EARN_APY } = useYieldHistory();
    const [amount, setAmount] = useState("");
    const [selectedWallet, setSelectedWallet] = useState(accounts[0]?.accountId ?? "");
    const monthlyEst = Number(amount || 0) * (EARN_APY / 100 / 12);
    const handleDeposit = () => {
        if (!amount || Number(amount) <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        toast.error("Yield deposits require a configured provider");
    };
    return (<BaseModal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Deposit to Earn" onClose={onClose} icon="/sidebar/earn.svg"/>
      <div className="flex flex-col w-[480px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-[14px] text-text-secondary font-barlow">From Wallet</p>
          <div className="flex gap-2">
            {accounts.map((acc) => (<button key={acc.accountId} onClick={() => setSelectedWallet(acc.accountId)} className={`flex-1 py-2 rounded-[12px] text-sm font-medium transition-all cursor-pointer border-b ${selectedWallet === acc.accountId
                ? "bg-app-background border-primary-blue text-text-primary" : "bg-app-background border-primary-divider text-text-secondary"}`}>
                {acc.name}
              </button>))}
          </div>
        </div>

        <InputFilled label="Amount (USDC)" placeholder="0.00" value={amount} type="number" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}/>

        {Number(amount) > 0 && (<div className="bg-badge-success-background border border-badge-success-border rounded-[12px] p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Current APY</span>
              <span className="text-badge-success-text font-semibold">{EARN_APY}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Est. monthly yield</span>
              <span className="text-text-primary font-medium">{fmtUsd(monthlyEst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Est. annual yield</span>
              <span className="text-text-primary font-medium">{fmtUsd(monthlyEst * 12)}</span>
            </div>
          </div>)}

        <div className="bg-app-background rounded-[12px] border-b border-primary-divider p-3 flex items-start gap-2">
          <img src="/misc/info-icon.svg" alt="info" className="w-4 h-4 mt-0.5 shrink-0 opacity-40" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}/>
          <p className="text-xs text-text-secondary leading-relaxed">
            Funds are backed by short-duration US Treasury Bills (T-Bills).
            Access, pricing, fees and redemption liquidity are determined by the provider.
          </p>
        </div>

        <div className="flex flex-row gap-2">
          <SecondaryButton text="Cancel" onClick={onClose} variant="light" buttonClassName="flex-1"/>
          <PrimaryButton text="Deposit" onClick={handleDeposit} containerClassName="flex-1"/>
        </div>
      </div>
    </BaseModal>);
}
function WithdrawModal({ isOpen, onClose, accounts, }: {
    isOpen: boolean;
    onClose: () => void;
    accounts: {
        accountId: string;
        name: string;
    }[];
}) {
    const { AVAILABLE_TO_WITHDRAW } = useYieldHistory();
    const [amount, setAmount] = useState("");
    const [selectedWallet, setSelectedWallet] = useState(accounts[0]?.accountId ?? "");
    const handleWithdraw = () => {
        if (!amount || Number(amount) <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        if (Number(amount) > AVAILABLE_TO_WITHDRAW) {
            toast.error("Insufficient balance");
            return;
        }
        toast.error("Yield withdrawals require a configured provider");
    };
    return (<BaseModal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Withdraw from Earn" onClose={onClose} icon="/sidebar/earn.svg"/>
      <div className="flex flex-col w-[480px] p-5 rounded-b-2xl border-2 border-t-0 border-primary-divider bg-background gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-[14px] text-text-secondary font-barlow">Withdraw to Wallet</p>
          <div className="flex gap-2">
            {accounts.map((acc) => (<button key={acc.accountId} onClick={() => setSelectedWallet(acc.accountId)} className={`flex-1 py-2 rounded-[12px] text-sm font-medium transition-all cursor-pointer border-b ${selectedWallet === acc.accountId
                ? "bg-app-background border-primary-blue text-text-primary" : "bg-app-background border-primary-divider text-text-secondary"}`}>
                {acc.name}
              </button>))}
          </div>
        </div>

        <div className="relative">
          <InputFilled label="Amount (USDC)" placeholder="0.00" value={amount} type="number" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}/>
          <button className="absolute right-3 top-9 text-xs font-semibold cursor-pointer" style={{ color: "var(--primary-blue)" }} onClick={() => setAmount(String(AVAILABLE_TO_WITHDRAW))}>
            MAX
          </button>
        </div>

        <div className="flex justify-between text-sm px-1">
          <span className="text-text-secondary">Available balance</span>
          <span className="text-text-primary font-medium">{fmtUsd(AVAILABLE_TO_WITHDRAW)}</span>
        </div>

        <div className="bg-app-background rounded-[12px] border-b border-primary-divider p-3 flex items-start gap-2">
          <img src="/misc/info-icon.svg" alt="info" className="w-4 h-4 mt-0.5 shrink-0 opacity-40" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}/>
          <p className="text-xs text-text-secondary leading-relaxed">
            Redemption requires current provider permissions and available liquidity. Fees may apply.
          </p>
        </div>

        <div className="flex flex-row gap-2">
          <SecondaryButton text="Cancel" onClick={onClose} variant="light" buttonClassName="flex-1"/>
          <PrimaryButton text="Withdraw" onClick={handleWithdraw} containerClassName="flex-1"/>
        </div>
      </div>
    </BaseModal>);
}
export default function EarnPage() {
    const { error, EARN_APY, TOTAL_DEPOSITED, AVAILABLE_TO_WITHDRAW, TOTAL_EARNED, MONTHLY_YIELD, TVL, DAILY_YIELD_DATA, MONTHLY_YIELD_DATA, activity: historicalActivity } = useYieldHistory();
    const { data } = useDemo();
    const { setTitle, setShowBackArrow } = useTitle();
    const [loading, setLoading] = useState(true);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [chartPeriod, setChartPeriod] = useState("daily");
    const [activityTab, setActivityTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    useEffect(() => {
        setTitle(<span className="text-[14px] font-medium text-text-primary">Earn</span>);
        setShowBackArrow(false);
    }, []);
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(t);
    }, []);
    const accounts = useMemo(() => {
        if (!data?.accounts)
            return [];
        return data.accounts.map((a) => ({ accountId: a.accountId, name: a.name }));
    }, [data?.accounts]);
    const chartData = chartPeriod === "daily" ? DAILY_YIELD_DATA : MONTHLY_YIELD_DATA;
    const filteredActivity = useMemo(() => {
        if (activityTab === "all")
            return historicalActivity;
        return historicalActivity.filter((a) => a.type === activityTab);
    }, [activityTab, historicalActivity]);
    const tableData = useMemo(() => {
        return filteredActivity.map((tx) => {
            const badgeStatus = tx.type === "yield"
                ? BadgeStatus.SUCCESS
                : tx.type === "deposit"
                    ? BadgeStatus.PUBLIC
                    : BadgeStatus.AWAITING;
            const badgeText = tx.type === "yield" ? "Yield" : tx.type === "deposit" ? "Deposit" : "Withdraw";
            const prefix = tx.type === "yield" ? "+" : tx.type === "deposit" ? "+" : "-";
            return {
                Type: (<div className="flex justify-start">
            <Badge status={badgeStatus} text={badgeText}/>
          </div>),
                Date: new Date(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                }),
                Wallet: tx.wallet,
                Amount: (<span className="font-semibold" style={{
                        color: tx.type === "yield"
                            ? "var(--badge-success-text)" : tx.type === "withdraw"
                            ? "var(--badge-awaiting-text)" : "var(--text-primary)",
                    }}>
            {prefix}{fmtUsd(tx.amount)}
          </span>),
                Status: (<div className="flex justify-center">
            <Badge status={BadgeStatus.SUCCESS} text="Completed"/>
          </div>),
            };
        });
    }, [filteredActivity]);
    if (loading || !data) {
        return (<div className="flex w-full h-full flex-col gap-5 px-6 pt-6">
        <div className="w-48 h-8 rounded bg-gray-200 animate-pulse"/>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (<div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse"/>))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (<div key={i} className="h-56 rounded-xl bg-gray-200 animate-pulse"/>))}
        </div>
        <div className="h-[300px] rounded-xl bg-gray-200 animate-pulse"/>
      </div>);
    }
    return (<>
      <div className="flex w-full h-full flex-col overflow-y-auto">{error && <p role="alert">{error.message}</p>}
        
        <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Earn</h1>
              <button onClick={() => setShowInfoModal(true)} className="w-5 h-5 rounded-full border border-primary-divider flex items-center justify-center cursor-pointer hover:bg-app-background transition-colors">
                <span className="text-xs text-text-secondary font-medium leading-none">i</span>
              </button>
            </div>
            <p className="text-[14px] text-text-secondary">
              Manage treasury reserves and view yield activity.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <SecondaryButton text="Withdraw" variant="light" onClick={() => setShowWithdrawModal(true)} buttonClassName="w-fit whitespace-nowrap"/>
            <PrimaryButton text="Deposit" icon="/misc/plus-icon.svg" iconPosition="left" onClick={() => setShowDepositModal(true)} containerClassName="w-fit" buttonClassName="w-fit whitespace-nowrap"/>
          </div>
        </div>

        
        <div className="flex w-full flex-row gap-2 px-6 pb-2">
          <StatCard title="APY" text={<span className="num text-2xl leading-none" style={{ color: "var(--badge-success-text)" }}>
                {EARN_APY}%
              </span>}/>
          <StatCard title="Total Deposited" text={<span className="num text-text-primary text-2xl leading-none">
                {fmtUsd(TOTAL_DEPOSITED)}
              </span>}/>
          <StatCard title="Available to Withdraw" text={<span className="num text-text-primary text-2xl leading-none">
                {fmtUsd(AVAILABLE_TO_WITHDRAW)}
              </span>}/>
          <StatCard title="Total Earned" text={<span className="num text-2xl leading-none" style={{ color: "var(--badge-success-text)" }}>
                +{fmtUsd(TOTAL_EARNED)}
              </span>}/>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-6 pt-3">
          
          <div className="rounded-xl border border-primary-divider bg-background p-5">
            <div className="flex items-center justify-between mb-5">
              <span className="text-text-primary text-lg font-medium">Yield Earned</span>
              <TabContainer tabs={[
            { id: "daily", label: "Daily" },
            { id: "monthly", label: "Monthly" },
        ]} activeTab={chartPeriod} setActiveTab={setChartPeriod} textSize="sm" tabWidth={70}/>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-divider)" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} interval={chartPeriod === "daily" ? 4 : 0}/>
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={50}/>
                <RechartsTooltip content={<ChartTooltip />}/>
                <Line type="monotone" dataKey="earned" stroke="var(--primary-blue)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--primary-blue)", stroke: "var(--background)", strokeWidth: 2 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          
          <div className="rounded-xl border border-primary-divider bg-background p-5 flex flex-col gap-4">
            <span className="text-text-primary text-lg font-medium">Earnings Summary</span>
            <div className="flex-1 flex flex-col">
              {[
            { label: "Recorded Monthly Yield", value: MONTHLY_YIELD, sub: "Monthly" },
            { label: "Total Earned", value: TOTAL_EARNED, sub: "All time" },
        ].map(({ label, value, sub }) => (<div key={label} className="flex items-center justify-between py-3 border-b border-primary-divider last:border-0">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                    <span className="text-xs text-text-secondary">{sub}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--badge-success-text)" }}>
                    +{fmtUsd(value)}
                  </span>
                </div>))}
            </div>

            
            <div className="flex gap-2">
              <div className="flex-1 bg-app-background rounded-lg px-3 py-2 flex flex-col gap-1">
                <span className="text-xs text-text-secondary">TVL</span>
                <span className="text-base font-semibold text-text-primary">{fmtUsd(TVL)}</span>
              </div>
              <div className="flex-1 bg-app-background rounded-lg px-3 py-2 flex flex-col gap-1">
                <span className="text-xs text-text-secondary">Backing</span>
                <span className="text-base font-semibold text-text-primary">US T-Bills</span>
              </div>
            </div>
          </div>
        </div>

        
        <div className="flex w-full items-start justify-between gap-4 px-6 pt-6">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[20px] font-bold leading-tight tracking-tight text-text-primary">Activity</h2>
            <p className="text-[14px] text-text-secondary">All deposit, withdrawal, and yield transactions</p>
          </div>
        </div>

        
        <div className="mt-2 flex w-full items-center justify-between gap-2 border-b border-primary-divider px-6 pb-3">
          <TabContainer tabs={[
            { id: "all", label: "All" },
            { id: "deposit", label: "Deposits" },
            { id: "yield", label: "Yield" },
            { id: "withdraw", label: "Withdrawals" },
        ]} activeTab={activityTab} setActiveTab={setActivityTab} textSize="sm"/>
          <span className="text-sm text-text-secondary">{filteredActivity.length} transactions</span>
        </div>

        
        <div className="w-full p-5">
          <Table headers={["Type", "Date", "Wallet", "Amount", "Status"]} data={tableData} className="w-full" rowClassName="py-5" headerClassName="py-3" showPagination={true} showFooter={false} currentPage={currentPage} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={setRowsPerPage}/>
        </div>
      </div>

      
      <HowItWorksModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)}/>
      <DepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} accounts={accounts}/>
      <WithdrawModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} accounts={accounts}/>
    </>);
}
