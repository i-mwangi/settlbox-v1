import React, { useState, useMemo, useEffect } from "react";
import { balanceSeries } from "@/presentation/services/utils/balance-timeseries";
import { BaseContainer } from "../Common/BaseContainer";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import TransactionHistory from "./Overview/TransactionHistory";
import { useLocalAccountBalances, useListAccountsByCompany, useMultisigAssets } from "@/presentation/services/api/multisig";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useDemo } from "@/presentation/contexts/DemoProvider";

import { TokenFilterDropdown } from "./Overview/TokenFilterDropdown";
import { PeriodFilterDropdown } from "./Overview/PeriodFilterDropdown";
const ASSET_COLORS: Record<string, string> = {
    USDC: "#2775CA",
    ETH: "#627EEA",
    MID: "#a855f7",
};
const DEFAULT_ASSET_COLOR = "#6b7280";
const CHART_GREYS = ["#374151", "#6b7280", "#4b5563", "#9ca3af", "#334155"];
const PERIODS = [
    { id: "year", label: "Year" },
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
    { id: "day", label: "Day" },
    { id: "hour", label: "Hour" },
    { id: "minute", label: "Minute" },
] as const;
type PeriodId = (typeof PERIODS)[number]["id"];
const BalanceOverviewHeader = ({ totalBalance = 0, accountIds, }: {
    totalBalance?: number;
    accountIds?: string[];
}) => {
    const { data } = useDemo();
    const symbols = ["USDC"];
    const [selectedTokens, setSelectedTokens] = useState<string[]>(["USDC"]);
    const toggleToken = (symbol: string) => setSelectedTokens(previous => previous.includes(symbol) ? [] : [symbol]);
    const tokenLabel = selectedTokens.length ? "USDC" : "No tokens";
    const [period, setPeriod] = useState<PeriodId>("day");
    const periodLabel = PERIODS.find(item => item.id === period)?.label || "Day";
    const [now,setNow]=useState(()=>Date.now());
    useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
    useEffect(()=>setNow(Date.now()),[data?.balanceHistory]);
    useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState === "visible")window.dispatchEvent(new Event("settlbox-workspace-refresh"));},60000);return()=>clearInterval(timer);},[]);
    const observations = data?.balanceHistory || [];
    const series=useMemo(()=>balanceSeries(observations,period,now),[observations,period,now]);
    const areaData=series.points;
    const recordedBucketCount=areaData.length;
    const first = areaData[0];
    const change = first ? totalBalance - first.USDC : 0;
    const balanceChange = { amount: change, percent: first && first.USDC > 0 ? change / first.USDC * 100 : 0 };
    const isPositiveChange = change >= 0;
    const verified = new Set(data?.verifiedTransactionIds || []);
    const periodFlow = (data?.transactions || []).filter(row => verified.has(row.id) && Date.parse(row.timestamp)>=series.start && Date.parse(row.timestamp)<=now).reduce((flow, row) => ({ inflow: flow.inflow + (row.type === "RECEIVE" ? row.amount : 0), outflow: flow.outflow + (row.type === "SEND" ? row.amount : 0) }), { inflow: 0, outflow: 0 });
    const colorForToken = (tk: string) => CHART_GREYS[Math.max(0, symbols.indexOf(tk)) % CHART_GREYS.length];
    const tokenColors = useMemo(() => {
        const m: Record<string, string> = {};
        for (const s of symbols)
            m[s] = colorForToken(s);
        return m;
    }, [symbols]);
    const tokenLogo = (tk: string) => `/token/${tk.toLowerCase()}.svg`;
    const BalanceTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length)
            return null;
        const dp = payload[0]?.payload;
        if (!dp)
            return null;
        const header = new Date(dp.time).toLocaleString();
        return (<div className="min-w-[168px] rounded-xl border border-primary-divider bg-background p-2.5 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.28)]">
        <div className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {header}
        </div>
        <div className="flex flex-col gap-2">
          {selectedTokens.map(tk => (<div key={tk} className="flex items-center gap-2">
              <span className="h-3 w-[3px] flex-shrink-0 rounded-full" style={{ backgroundColor: colorForToken(tk) }}/>
              <img src={tokenLogo(tk)} alt={tk} className="h-4 w-4 flex-shrink-0 rounded-full" onError={e => {
                    (e.currentTarget as HTMLImageElement).src = "/token/any-token.svg";
                }}/>
              <span className="text-xs font-medium text-text-primary">{tk}</span>
              <span className="num ml-auto text-xs font-semibold text-text-primary">
                {(Number(dp[`${tk}__bal`]) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>))}
        </div>
      </div>);
    };
    return (<div id="tour-balance-overview" className="w-full p-5 bg-background rounded-2xl border border-primary-divider flex flex-row gap-10">
      
      <div className="flex shrink-0 flex-col justify-between py-1">
        <p className="text-sm text-text-secondary">Total Balance</p>
        <div className="space-y-1">
          <div className="flex items-start gap-1">
            <span className="text-3xl num text-text-primary">$</span>
            <span className="text-4xl num text-text-primary tracking-tight">
              {totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm num ${isPositiveChange ? "text-green-500" : "text-red-500"}`}>
              {isPositiveChange ? "+" : ""}$
              {Math.abs(balanceChange.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            {balanceChange.percent !== 0 && (<span className={`px-2 py-1 text-xs font-semibold rounded-full border ${isPositiveChange
                ? "text-green-700 bg-green-100 border-green-300" : "text-red-700 bg-red-100 border-red-300"}`}>
                {isPositiveChange ? "+" : ""}
                {balanceChange.percent.toFixed(2)}%
              </span>)}
          </div>
          {(periodFlow.inflow > 0 || periodFlow.outflow > 0) && (<div className="flex items-center gap-3 text-xs text-text-secondary">
              {periodFlow.inflow > 0 && (<span className="text-green-500">
                  In: +${periodFlow.inflow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>)}
              {periodFlow.outflow > 0 && (<span className="text-red-500">
                  Out: -${periodFlow.outflow.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>)}
            </div>)}
        </div>
      </div>

      
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-end gap-2">
          <PeriodFilterDropdown period={period} onChange={setPeriod} label={periodLabel}/>
          {symbols.length > 0 && (<TokenFilterDropdown tokens={symbols} selected={selectedTokens} onToggle={toggleToken} colors={tokenColors} label={tokenLabel}/>)}
        </div>
        <div className="w-full relative">
          {selectedTokens.length > 0 && recordedBucketCount < 2 && (<p role="status" className="absolute left-3 top-3 z-10 max-w-[75%] text-xs text-text-secondary">
            {recordedBucketCount === 0 ? "No recorded balance history for this period." : "One recorded observation. More points appear as balances are observed."}
          </p>)}
          
          <ResponsiveContainer width="100%" height={200} className="rounded-xl outline-none [&_*]:outline-none">
            <AreaChart data={areaData} margin={{ top: 28, right: 8, left: 8, bottom: 0 }} className="[&_*]:outline-none !outline-none">
              <defs>
                <linearGradient id="bal-fill-grey" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#374151" stopOpacity={0.16}/>
                  <stop offset="100%" stopColor="#374151" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" type="number" scale="time" domain={series.domain} ticks={series.ticks} tickFormatter={series.label} axisLine={false} tickLine={false} tick={{fill:"var(--text-secondary)",fontSize:11}} tickMargin={10} minTickGap={35}/>

              <Tooltip content={<BalanceTooltip />} cursor={{ stroke: "#1b1b1b", strokeDasharray: "3 4", strokeWidth: 1 }}/>
              {selectedTokens.map(tk => (<Area key={tk} type="stepAfter" dataKey={tk} stroke={colorForToken(tk)} strokeWidth={2.5} fill="url(#bal-fill-grey)" dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} activeDot={{ r: 5, fill: "#ffffff", stroke: colorForToken(tk), strokeWidth: 2 }}/>))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>);
};
export const Overview = ({ onCreateAccount }: {
    onCreateAccount?: () => void;
}) => {
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts } = useListAccountsByCompany(myCompany?.id, { enabled: !!myCompany?.id });
    const accountIds = multisigAccounts?.map(acc => acc.accountId);
    const { data: balanceData } = useLocalAccountBalances(accountIds);
    const totalBalance = balanceData?.totalBalance ?? 0;
    return (<div className="w-full flex flex-col gap-4">
      <BalanceOverviewHeader totalBalance={totalBalance} accountIds={accountIds}/>
      <TransactionHistory onCreateAccount={onCreateAccount}/>
    </div>);
};
