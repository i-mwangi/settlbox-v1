"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, } from "recharts";
function fmtUsd(n: number): string {
    return n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
function fmtCompact(n: number): string {
    if (n >= 1000000)
        return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `$${(n / 1000).toFixed(1)}K`;
    return fmtUsd(n);
}
function fmtMonth(raw: string): string {
    const [year, month] = raw.split("-");
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${names[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}
function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)
        return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)
        return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30)
        return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}
const INFLOW = "#4CAF50";
const OUTFLOW = "#F44336";
const ACCENT = "#3B82F6";
const CATEGORY_COLORS = [
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#10B981",
    "#EC4899",
    "#6366F1",
    "#14B8A6",
];
function Skeleton({ className = "" }: {
    className?: string;
}) {
    return <div className={`animate-pulse rounded-[8px] bg-gray-200 ${className}`}/>;
}
function CardSkeleton({ height = "h-[200px]" }: {
    height?: string;
}) {
    return (<div className={`bg-white rounded-[12px] border border-primary-divider p-6 ${height}`}>
      <Skeleton className="h-4 w-32 mb-4"/>
      <Skeleton className="h-8 w-48 mb-6"/>
      <Skeleton className="h-full max-h-[100px] w-full"/>
    </div>);
}
function FlowTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length)
        return null;
    return (<div className="bg-white border border-primary-divider rounded-[8px] px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((p: any) => (<p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmtUsd(p.value)}
        </p>))}
    </div>);
}
export default function TreasuryPage() {
    const { data } = useDemo();
    const { setTitle, setShowBackArrow } = useTitle();
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <span className="font-medium text-text-primary">Treasury</span>
      </div>);
        setShowBackArrow(false);
    }, []);
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 800);
        return () => clearTimeout(t);
    }, []);
    const flowChartData = useMemo(() => {
        if (!data?.monthlyFinancials)
            return [];
        return data.monthlyFinancials.map((m) => ({
            month: fmtMonth(m.month),
            Inflow: m.income,
            Outflow: m.expenses + m.payroll,
        }));
    }, [data?.monthlyFinancials]);
    const burnRate = useMemo(() => {
        if (!data?.monthlyFinancials || !data?.totalBalance)
            return null;
        const last3 = data.monthlyFinancials.slice(-3);
        const avgExpenses = last3.reduce((sum, m) => sum + m.expenses + m.payroll, 0) / last3.length;
        const runwayMonths = avgExpenses > 0 ? Math.floor(data.totalBalance / avgExpenses) : Infinity;
        return { avgExpenses, runwayMonths };
    }, [data?.monthlyFinancials, data?.totalBalance]);
    const categoryData = useMemo(() => {
        if (!data?.transactions)
            return [];
        const map: Record<string, number> = {};
        for (const tx of data.transactions) {
            if (tx.type !== "SEND" || tx.category === "Internal Transfer")
                continue;
            const usd = tx.currency === "ETH" ? tx.amount * 3300 : tx.amount;
            map[tx.category] = (map[tx.category] || 0) + usd;
        }
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [data?.transactions]);
    const recentTxs = useMemo(() => {
        if (!data?.transactions)
            return [];
        return data.transactions.slice(0, 10);
    }, [data?.transactions]);
    const tokenBreakdown = useMemo(() => {
        if (!data?.balances || !data?.accounts)
            return [];
        const tokens: Record<string, {
            symbol: string;
            total: number;
            byWallet: Record<string, number>;
        }> = {};
        for (const account of data.accounts) {
            const bals = data.balances[account.accountId] || [];
            for (const b of bals) {
                if (!tokens[b.symbol])
                    tokens[b.symbol] = { symbol: b.symbol, total: 0, byWallet: {} };
                const usd = b.usdValue ?? b.amount;
                tokens[b.symbol].total += usd;
                tokens[b.symbol].byWallet[account.name] = usd;
            }
        }
        return Object.values(tokens).sort((a, b) => b.total - a.total);
    }, [data?.balances, data?.accounts]);
    const walletBreakdown = useMemo(() => {
        if (!data?.balances || !data?.accounts)
            return [];
        return data.accounts.map((acc) => {
            const bals = data.balances[acc.accountId] || [];
            const total = bals.reduce((s, b) => s + (b.usdValue ?? b.amount), 0);
            return { ...acc, balances: bals, total };
        });
    }, [data?.balances, data?.accounts]);
    if (loading || !data) {
        return (<div className="flex w-full h-full flex-col bg-background">
        <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
          <div className="flex flex-col gap-0.5">
            <Skeleton className="h-7 w-40 mb-1"/>
            <Skeleton className="h-4 w-64"/>
          </div>
        </div>
        <div className="flex flex-col gap-5 px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardSkeleton height="h-[320px]"/>
            <CardSkeleton height="h-[320px]"/>
          </div>
          <CardSkeleton height="h-[300px]"/>
        </div>
      </div>);
    }
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Treasury</h1>
          <p className="text-[14px] text-text-secondary">
            Track balances, cash flow, and runway across your wallets and tokens.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-6 pb-6">
        
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-text-secondary font-medium mb-1">Total Treasury Balance</p>
            <p className="text-[40px] leading-tight font-bold text-text-primary tracking-tight">
              {fmtUsd(data.totalBalance)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {burnRate && burnRate.runwayMonths !== Infinity && (<div className="bg-white rounded-[12px] border border-primary-divider px-4 py-3 text-right">
                <p className="text-xs text-text-secondary">Burn Rate</p>
                <p className="text-base font-semibold text-text-primary">
                  {fmtCompact(burnRate.avgExpenses)}
                  <span className="text-text-secondary font-normal text-sm">/mo</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: burnRate.runwayMonths > 12 ? INFLOW : OUTFLOW }}>
                  {burnRate.runwayMonths} months runway
                </p>
              </div>)}
          </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {tokenBreakdown.map((token) => (<div key={token.symbol} className="bg-white rounded-[12px] border border-primary-divider p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: token.symbol === "USDC" ? ACCENT : "#6366F1" }}>
                  {token.symbol === "USDC" ? "$" : "E"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{token.symbol}</p>
                  <p className="text-xs text-text-secondary">
                    {token.symbol === "USDC" ? "Tether" : "Ethereum"}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary mb-3">{fmtUsd(token.total)}</p>
              <div className="border-t border-primary-divider pt-3 space-y-2">
                {Object.entries(token.byWallet).map(([wallet, val]) => (<div key={wallet} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{wallet}</span>
                    <span className="text-text-primary font-medium">{fmtUsd(val)}</span>
                  </div>))}
              </div>
            </div>))}

          
          <div className="bg-white rounded-[12px] border border-primary-divider p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary mb-4">Wallet Overview</p>
            <div className="space-y-4">
              {walletBreakdown.map((w) => {
            const pct = data.totalBalance > 0 ? (w.total / data.totalBalance) * 100 : 0;
            return (<div key={w.accountId}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm font-medium text-text-primary">{w.name}</span>
                      <span className="text-sm font-semibold text-text-primary">{fmtUsd(w.total)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${pct}%`,
                    backgroundColor: ACCENT,
                }}/>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-text-secondary">{pct.toFixed(1)}% of total</span>
                      <span className="text-xs text-text-secondary">
                        {w.balances.map((b) => `${b.amount.toLocaleString()} ${b.symbol}`).join(", ")}
                      </span>
                    </div>
                  </div>);
        })}
            </div>
          </div>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          <div className="bg-white rounded-[12px] border border-primary-divider p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-text-primary">Inflow vs Outflow</p>
              <p className="text-xs text-text-secondary">Last 6 months</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={flowChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#848484" }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={(v) => fmtCompact(v)} tick={{ fontSize: 12, fill: "#848484" }} axisLine={false} tickLine={false} width={60}/>
                <Tooltip content={<FlowTooltip />}/>
                <Bar dataKey="Inflow" fill={INFLOW} radius={[4, 4, 0, 0]} maxBarSize={36}/>
                <Bar dataKey="Outflow" fill={OUTFLOW} radius={[4, 4, 0, 0]} maxBarSize={36}/>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INFLOW }}/>
                <span className="text-xs text-text-secondary">Inflow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: OUTFLOW }}/>
                <span className="text-xs text-text-secondary">Outflow</span>
              </div>
            </div>
          </div>

          
          <div className="bg-white rounded-[12px] border border-primary-divider p-5 shadow-sm">
            <p className="text-sm font-semibold text-text-primary mb-4">Expenses by Category</p>
            <div className="flex items-center gap-4">
              <div className="w-[180px] h-[220px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {categoryData.map((_, i) => (<Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}/>))}
                    </Pie>
                    <Tooltip formatter={(value => fmtUsd(Number(value ?? 0)))} contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e7e8ec",
        }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5">
                {categoryData.map((cat, i) => {
            const total = categoryData.reduce((s, c) => s + c.value, 0);
            const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : "0";
            return (<div key={cat.name} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-text-primary truncate">{cat.name}</span>
                          <span className="text-xs text-text-secondary ml-2">{pct}%</span>
                        </div>
                        <p className="text-xs text-text-secondary">{fmtUsd(cat.value)}</p>
                      </div>
                    </div>);
        })}
              </div>
            </div>
          </div>
        </div>

        
        <div className="bg-white rounded-[12px] border border-primary-divider shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-primary-divider">
            <p className="text-sm font-semibold text-text-primary">Monthly Financials</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Month</th>
                  <th className="text-right px-5 py-3 font-medium">Income</th>
                  <th className="text-right px-5 py-3 font-medium">Expenses</th>
                  <th className="text-right px-5 py-3 font-medium">Payroll</th>
                  <th className="text-right px-5 py-3 font-medium">Net Flow</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyFinancials.map((m) => (<tr key={m.month} className="border-t border-primary-divider hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-text-primary">{fmtMonth(m.month)}</td>
                    <td className="px-5 py-3 text-right" style={{ color: INFLOW }}>
                      {m.income > 0 ? `+${fmtUsd(m.income)}` : fmtUsd(0)}
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary">{fmtUsd(m.expenses)}</td>
                    <td className="px-5 py-3 text-right text-text-primary">{fmtUsd(m.payroll)}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: m.netFlow >= 0 ? INFLOW : OUTFLOW }}>
                      {m.netFlow >= 0 ? "+" : ""}
                      {fmtUsd(m.netFlow)}
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>

        
        <div className="bg-white rounded-[12px] border border-primary-divider shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-primary-divider flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">Recent Activity</p>
            <span className="text-xs text-text-secondary">Last 10 transactions</span>
          </div>
          <div className="divide-y divide-primary-divider">
            {recentTxs.map((tx) => {
            const isInflow = tx.type === "RECEIVE";
            return (<div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
                    backgroundColor: isInflow ? "#E8F5E9" : "#FFEBEE",
                    color: isInflow ? INFLOW : OUTFLOW,
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      {isInflow ? (<path d="M7 11V3M7 3L3 7M7 3l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>) : (<path d="M7 3v8M7 11l4-4M7 11L3 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>)}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">{tx.label}</span>
                      <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-gray-100 rounded-full flex-shrink-0">
                        {tx.category}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                      {isInflow ? `From ${tx.from}` : `To ${tx.to}`}
                      {" / "}
                      {tx.from === "Treasury" || tx.to === "Treasury" ? "Treasury" : "Operations"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold" style={{ color: isInflow ? INFLOW : OUTFLOW }}>
                      {isInflow ? "+" : "-"}
                      {tx.amount.toLocaleString()} {tx.currency}
                    </p>
                    <p className="text-xs text-text-secondary">{relativeTime(tx.timestamp)}</p>
                  </div>
                </div>);
        })}
          </div>
        </div>
      </div>
    </div>);
}
