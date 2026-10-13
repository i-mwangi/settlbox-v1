"use client";
import React, { useState, useEffect } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import PayoutWorkflow from "@/presentation/components/Setting/PayoutWorkflow";
import { Badge, BadgeStatus } from "@/presentation/components/Common/Badge";

function fmt(n: number, d = 2) {
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
const StatCard = ({ label, value, sub }: {
    label: string;
    value: string;
    sub?: string;
}) => (<div className="flex-1 rounded-xl border border-primary-divider p-4 flex flex-col gap-2" style={{ backgroundImage: "url(/card/background.svg)", backgroundSize: "30%", backgroundPosition: "right", backgroundRepeat: "no-repeat" }}>
    <span className="text-text-secondary text-sm leading-none">{label}</span>
    <span className="num text-text-primary text-2xl leading-none">{value}</span>
    {sub && <span className="text-text-secondary text-xs">{sub}</span>}
  </div>);
export default function CashoutPage() {
    const { data } = useDemo();
    const { setTitle, setShowBackArrow } = useTitle();
    const [loading, setLoading] = useState(true);




    useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
    useEffect(() => {
        setTitle(<span className="text-[14px] font-medium text-text-primary">Cashout</span>);
        setShowBackArrow(false);
    }, []);
    const rampHistory = data?.rampHistory ?? [];
    const totalCashedOut = rampHistory.filter(h => h.type === "OFF_RAMP").reduce((s, h) => s + h.toAmount, 0);
    const totalDeposited = rampHistory.filter(h => h.type === "ON_RAMP").reduce((s, h) => s + h.toAmount, 0);
    if (loading || !data) {
        return (<div className="flex w-full h-full flex-col gap-4 px-6 pt-6 pb-5">
        <div className="h-8 w-48 bg-primary-divider rounded animate-pulse"/>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="flex-1 h-24 bg-primary-divider rounded-xl animate-pulse"/>)}
        </div>
        <div className="flex-1 bg-primary-divider rounded-2xl animate-pulse"/>
      </div>);
    }
    return (<div className="flex w-full h-full flex-col">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Cashout</h1>
          <p className="text-[14px] text-text-secondary">
            Prepare reviewed bank and mobile-money payouts in the Kora sandbox. Live USDC conversion is not enabled.
          </p>
        </div>
      </div>

      
      <div className="flex w-full flex-row gap-2 px-6 pb-2">
        <StatCard label="Treasury Balance" value={`$${fmt(data.totalBalance)}`} sub="Workspace balance; separate from provider funds"/>
        <StatCard label="Recorded Cashouts" value={`$${fmt(totalCashedOut)}`} sub={`${rampHistory.filter(h => h.type === "OFF_RAMP").length} withdrawals`}/>
        <StatCard label="Recorded Deposits" value={`$${fmt(totalDeposited)}`} sub={`${rampHistory.filter(h => h.type === "ON_RAMP").length} deposits`}/>
      </div>

      
      <div className="flex flex-col xl:flex-row gap-4 w-full px-6 pb-5 flex-1 min-h-0 overflow-y-auto">
        
        <div className="w-full max-w-[560px] overflow-y-auto rounded-2xl border border-primary-divider p-5"><PayoutWorkflow /></div>
        <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-primary-divider overflow-hidden">
          <div className="flex items-center justify-between w-full p-5 border-b border-primary-divider">
            <span className="text-lg font-semibold text-text-primary">Withdrawal History</span>
            <span className="text-sm text-text-secondary">{rampHistory.length} transactions</span>
          </div>
          <div className="overflow-auto thin-scrollbar">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-divider">
                  <th className="text-left text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Type</th>
                  <th className="text-right text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Crypto</th>
                  <th className="text-right text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Fiat</th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Bank</th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase whitespace-nowrap px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rampHistory.length === 0 ? (<tr>
                    <td colSpan={6} className="text-center py-16 text-text-secondary text-sm">
                      <img src="/misc/hexagon-multisig-icon.svg" alt="empty" className="w-20 mx-auto mb-3 opacity-50"/>
                      No withdrawals yet
                    </td>
                  </tr>) : (rampHistory.map(entry => {
            const isWithdraw = entry.type === "OFF_RAMP";
            return (<tr key={entry.id} className="border-b border-primary-divider last:border-b-0 hover:bg-app-background transition-colors">
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-text-primary">{fmtDate(entry.completedAt)}</td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isWithdraw ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                            {isWithdraw ? "Withdraw" : "Deposit"}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-right font-medium text-text-primary">
                          {isWithdraw ? "-" : "+"}{fmt(isWithdraw ? entry.fromAmount : entry.toAmount)} {isWithdraw ? entry.fromCurrency : entry.toCurrency}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-right font-medium text-text-primary">
                          {isWithdraw ? "+" : "-"}{fmt(isWithdraw ? entry.toAmount : entry.fromAmount)} {isWithdraw ? entry.toCurrency : entry.fromCurrency}
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-sm text-text-secondary">{entry.bankAccount}</td>
                        <td className="px-3 py-3.5 whitespace-nowrap text-center">
                          <Badge text={entry.status.charAt(0) + entry.status.slice(1).toLowerCase()} status={BadgeStatus.SUCCESS}/>
                        </td>
                      </tr>);
        }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>);
}
