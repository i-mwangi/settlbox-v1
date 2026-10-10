"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useListAccountsByCompany, useLocalAccountBalances, useListProposalsByCompany } from "@/presentation/services/api/multisig";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { formatUnits } from "viem";
import type { MultisigProposalResponseDto, MultisigAccountResponseDto } from "@/presentation/types";
import { USDC_TOKEN_ADDRESS } from "@/presentation/services/utils/constant";
import { formatNumberWithCommas } from "@/presentation/services/utils/formatNumber";
import { supportedTokens } from "@/presentation/services/utils/supportedToken";
import { blo } from "blo";
import { StatusPill } from "@/presentation/components/Common/StatusPill";
import { GraphUp as TrendUp } from "iconoir-react";
import { identiconSeed } from "@/services/arc/identicon";
import { usePSMProvider, type EnrichedBalance } from "@/presentation/contexts/PSMProvider";
import { useArcPayment } from "@/presentation/contexts/ArcPaymentProvider";
import { useYieldHistory } from "@/presentation/services/api/provider-history";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { getFaucetMetadata } from "@/presentation/services/utils/arc-token";
import type { FaucetMetadata } from "@/presentation/types/faucet";
interface Account {
    id: string;
    name: string;
    percentage: number;
    balance: string;
    color: string;
}
interface TokenMeta {
    symbol: string;
    decimals: number;
    bech32?: string;
}
const chartColors = ["#6366f1", "#3b82f6", "#60a5fa", "#93c5fd", "#a78bfa", "#c084fc"];
function formatDate(raw: string | Date): string {
    const d = new Date(raw);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function truncateId(id: string, len = 10): string {
    if (id.length <= len)
        return id;
    return id.slice(0, len) + "...";
}
function getTokenLogo(tokenAddress?: string, bech32Address?: string): string {
    if (!tokenAddress && !bech32Address)
        return "/token/any-token.svg";
    const addrForCompare = bech32Address || tokenAddress || "";
    const normalizedSettlbox = USDC_TOKEN_ADDRESS.split("_")[0];
    const normalizedAddr = addrForCompare.split("_")[0];
    if (normalizedSettlbox === normalizedAddr)
        return "/token/usdc.svg";
    const known = supportedTokens.find(t => normalizedAddr.startsWith(t.faucetId.split("_")[0]));
    if (known)
        return `/token/${known.symbol.toLowerCase()}.svg`;
    try {
        const hex = bech32Address ? identiconSeed(bech32Address) : identiconSeed(tokenAddress || "");
        return blo(hex);
    }
    catch {
        return "/token/any-token.svg";
    }
}
function proposalToRow(proposal: MultisigProposalResponseDto, accountMap: Map<string, MultisigAccountResponseDto>, allEnrichedBalances: EnrichedBalance[], tokenMetaMap: Map<string, TokenMeta>) {
    const isOutgoing = proposal.proposalType === "SEND";
    const token = proposal.tokens?.[0];
    const tokenAddress = token?.address || proposal.faucetId || "";
    const tokenAddrLower = tokenAddress.toLowerCase();
    const enriched = tokenAddress
        ? allEnrichedBalances.find(eb => eb.faucetId.toLowerCase() === tokenAddrLower)
        : undefined;
    const bech32Addr = enriched?.faucetBech32 || "";
    const knownToken = bech32Addr
        ? supportedTokens.find(t => bech32Addr.startsWith(t.faucetId.split("_")[0]))
        : undefined;
    const resolvedMeta = tokenMetaMap.get(tokenAddrLower);
    const symbol = enriched?.symbol || knownToken?.symbol || resolvedMeta?.symbol || token?.symbol || "TOKEN";
    const decimals = enriched?.decimals ?? knownToken?.decimals ?? resolvedMeta?.decimals ?? token?.decimals ?? 8;
    const resolvedBech32 = bech32Addr || resolvedMeta?.bech32 || "";
    let rawAmountStr = "0";
    if (proposal.payments?.length) {
        const total = proposal.payments.reduce((sum, p) => sum + BigInt(p.amount || 0), BigInt(0));
        rawAmountStr = total.toString();
    }
    else if (proposal.amount) {
        rawAmountStr = proposal.amount;
    }
    else if (token?.amount) {
        rawAmountStr = token.amount;
    }
    let humanAmount: string;
    try {
        humanAmount = formatUnits(BigInt(rawAmountStr), decimals);
    }
    catch {
        humanAmount = "0";
    }
    const account = accountMap.get(proposal.accountId);
    const accountName = account?.name ?? truncateId(proposal.accountId);
    const tokenLogo = getTokenLogo(tokenAddress, resolvedBech32);
    return {
        id: proposal.uuid,
        date: formatDate(proposal.createdAt),
        timestamp: new Date(proposal.createdAt).getTime(),
        accountName,
        accountId: proposal.accountId,
        recipientId: proposal.recipientId ? truncateId(proposal.recipientId) : undefined,
        type: isOutgoing ? ("outgoing" as const) : ("incoming" as const),
        symbol,
        tokenLogo,
        displayAmount: `${isOutgoing ? "-" : "+"}${formatNumberWithCommas(humanAmount)} ${symbol}`,
        tokenAmount: `${isOutgoing ? "-" : ""}${formatNumberWithCommas(humanAmount)} ${symbol}`,
    };
}
function useResolvedTokenMeta(faucetHexIds: string[]) {
    return useMemo(() => new Map<string, TokenMeta>(faucetHexIds.map(id => [id.toLowerCase(), { symbol: "USDC", decimals: 6 }])), [faucetHexIds]);
}
const TransactionHistory = ({ onCreateAccount }: {
    onCreateAccount?: () => void;
}) => {
    const yieldHistory = useYieldHistory();
    const { data: demoData } = useDemo();
    const cardPoolBalance = demoData?.cardPoolBalance ?? 0;
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const router = useRouter();
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts } = useListAccountsByCompany(myCompany?.id, { enabled: !!myCompany?.id });
    const accountIds = useMemo(() => multisigAccounts?.map(a => a.accountId) || [], [multisigAccounts]);
    const { data: localBalances } = useLocalAccountBalances(accountIds, { enabled: accountIds.length > 0 });
    const { data: proposals } = useListProposalsByCompany(myCompany?.id, { enabled: !!myCompany?.id });
    const { accountCacheMap } = usePSMProvider();
    const allEnrichedBalances = useMemo(() => {
        const balances: EnrichedBalance[] = [];
        for (const cache of accountCacheMap.values()) {
            balances.push(...cache.enrichedBalances);
        }
        return balances;
    }, [accountCacheMap]);
    const unresolvedFaucetIds = useMemo(() => {
        if (!proposals)
            return [];
        const enrichedSet = new Set(allEnrichedBalances.map(eb => eb.faucetId.toLowerCase()));
        const ids = new Set<string>();
        for (const p of proposals) {
            if (p.status !== "EXECUTED")
                continue;
            const token = p.tokens?.[0];
            const addr = token?.address || p.faucetId || "";
            if (!addr)
                continue;
            const addrLower = addr.toLowerCase();
            if (enrichedSet.has(addrLower))
                continue;
            ids.add(addr);
        }
        return Array.from(ids);
    }, [proposals, allEnrichedBalances]);
    const tokenMetaMap = useResolvedTokenMeta(unresolvedFaucetIds);
    const accountMap = useMemo(() => {
        const m = new Map<string, MultisigAccountResponseDto>();
        for (const acc of multisigAccounts ?? []) {
            m.set(acc.accountId, acc);
        }
        return m;
    }, [multisigAccounts]);
    const transactions = useMemo(() => {
        if (!proposals)
            return [];
        return proposals
            .filter(p => p.status === "EXECUTED")
            .map(p => proposalToRow(p, accountMap, allEnrichedBalances, tokenMetaMap))
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [proposals, accountMap, allEnrichedBalances, tokenMetaMap]);
    const pendingCount = useMemo(() => {
        if (!proposals)
            return 0;
        return proposals.filter(p => p.status === "PENDING" || p.status === "READY").length;
    }, [proposals]);
    const accounts: Account[] = useMemo(() => {
        if (!multisigAccounts || !localBalances)
            return [];
        const totalBalance = localBalances.totalBalance;
        return localBalances.accounts.map((acc, index) => {
            const matchingAccount = multisigAccounts.find(msa => msa.accountId === acc.accountId);
            const percentage = totalBalance > 0 ? (acc.balance / totalBalance) * 100 : 0;
            return {
                id: acc.accountId,
                name: matchingAccount?.name || truncateId(acc.accountId, 12),
                percentage: Math.round(percentage),
                balance: `$${acc.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                color: chartColors[index % chartColors.length],
            };
        });
    }, [multisigAccounts, localBalances]);
    return (<div className="w-full flex flex-col lg:flex-row gap-4 items-stretch">
      
      <div id="tour-money-in-out" className="flex-1 rounded-2xl border border-primary-divider bg-background p-5 flex gap-3 flex-col">
        <h3 className="text-base font-medium text-text-primary">Quick Stats</h3>

        <div className="flex flex-col gap-2">
          
          <div onClick={() => router.push("/earn")} className="bg-app-background rounded-2xl p-4 flex flex-col gap-1 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:bg-background hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:ring-1 hover:ring-primary-divider">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm text-text-secondary">Earn</span>
              <StatusPill variant="success" icon={TrendUp}>
                {yieldHistory.EARN_APY}% historical APY
              </StatusPill>
            </div>
            <span className="text-2xl num text-text-primary">${yieldHistory.TOTAL_DEPOSITED.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-badge-success-text num mt-1">+${yieldHistory.TOTAL_EARNED.toLocaleString("en-US", { minimumFractionDigits: 2 })} historical earnings</span>
          </div>

          
          <div className="flex flex-row gap-2 items-stretch">
          <div onClick={() => router.push("/card")} className="flex-1 bg-app-background rounded-2xl p-4 flex flex-col gap-1 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:bg-background hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:ring-1 hover:ring-primary-divider">
            <span className="text-sm text-text-secondary">Card Pool History</span>
            <span className="text-2xl num text-text-primary">
              ${(cardPoolBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <img src="/token/usdc.svg" alt="USDC" className="w-4 h-4"/>
              <span className="text-xs text-text-secondary num">{cardPoolBalance.toLocaleString()} USDC</span>
            </div>
          </div>

          
          <div onClick={() => router.push("/transactions")} className="flex-1 bg-app-background rounded-2xl p-4 flex flex-col gap-1 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:bg-background hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:ring-1 hover:ring-primary-divider">
            <span className="text-sm text-text-secondary">Pending Actions</span>
            <span className="text-2xl num text-text-primary">{pendingCount}</span>
            <span className="text-xs text-text-secondary mt-0.5">
              {pendingCount === 0
            ? "All caught up" : `${pendingCount} transaction${pendingCount !== 1 ? "s" : ""} awaiting approval`}
            </span>
          </div>
          </div>
        </div>
      </div>

      
      <div id="tour-multisig" className="flex-1 gap-3 flex flex-col rounded-2xl border border-primary-divider bg-background p-5">
        <h3 className="text-base font-medium">All Accounts</h3>

        <div className="w-full flex flex-row rounded-2xl h-full items-center gap-4">
          {accounts.length === 0 ? (<div className="flex flex-col gap-3 items-center justify-center w-full h-full py-12">
              <img src="/misc/hexagon-contact-icon.svg" alt="No Multisig Account" className="w-20 h-20"/>
              <p className="text-sm font-medium text-text-secondary">
                You need to create a multisig account to access this feature.
              </p>
              <button onClick={onCreateAccount} className="bg-text-primary hover:bg-text-primary/90 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
                Create account
              </button>
            </div>) : (<>
              
              <div className="flex h-56 w-[190px] shrink-0 items-center justify-center">
                <PieChart width={190} height={224}>
                  <Pie data={accounts.map(acc => ({ name: acc.name, value: acc.percentage }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" isAnimationActive={false} onMouseEnter={(_, idx) => setActiveIndex(idx)} onMouseLeave={() => setActiveIndex(null)}>
                    {accounts.map((account, index) => (<Cell key={`cell-${account.id}`} fill={account.color} fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.25} stroke="none" style={{ transition: "fill-opacity 200ms ease", cursor: "pointer", outline: "none" }}/>))}
                  </Pie>
                  <Tooltip content={() => null}/>
                </PieChart>
              </div>

              
              <div className="flex-1 space-y-px">
                <div className="flex items-center px-4 py-2 gap-4 border-b border-primary-divider text-text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Weight</span>
                  </div>
                  <div className="flex-[2]">
                    <p className="text-sm font-medium">Account</p>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-medium">Balance</p>
                  </div>
                </div>
                {accounts.map((account, index) => (<div key={account.id} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} className={`flex items-center px-4 py-3 gap-4 rounded-lg transition-colors ${index !== accounts.length - 1 ? "border-b border-primary-divider" : ""} ${activeIndex === index ? "bg-app-background" : ""} ${activeIndex !== null && activeIndex !== index ? "opacity-40" : "opacity-100"}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }}></div>
                      <span className="text-sm num">{account.percentage}%</span>
                    </div>
                    <div className="min-w-0 flex-[2]">
                      <p className="truncate text-sm font-medium" title={account.name}>{account.name}</p>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm num whitespace-nowrap">{account.balance}</p>
                    </div>
                  </div>))}
              </div>
            </>)}
        </div>
      </div>
    </div>);
};
export default TransactionHistory;
