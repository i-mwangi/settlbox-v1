"use client";
import { useQuery } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { readUsycPosition } from "@/services/server/usyc";
type Position = Awaited<ReturnType<typeof readUsycPosition>>;
export default function UsycPosition() {
  const query=useQuery({queryKey:["usyc-position"],queryFn:()=>workspaceFetch<Position>("/api/earn/usyc"),retry:false,refetchInterval:60000});
  const data=query.data;
  return <section className="mx-6 mt-4 rounded-xl border border-primary-divider bg-background p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">USYC reserves</h2><p className="text-sm text-text-secondary">Live Arc Testnet holdings · Test assets have no monetary value</p></div><button disabled={query.isFetching} onClick={()=>void query.refetch()} className="rounded-lg border border-primary-divider px-3 py-2 text-sm disabled:opacity-50">{query.isFetching?"Checking chain…":"Refresh USYC"}</button></div>
    {query.error && <p role="alert" className="text-sm">{query.error.message}{data?" The values below are the last successful observation.":""}</p>}
    {data && <>
      <p className="text-xs break-all text-text-secondary">Company reserve wallet: {data.wallet}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[["USYC holdings",`${data.holdingsUsyc} USYC`],["Estimated reserve value",data.estimatedValueUsdc===null?"Unavailable":`${data.estimatedValueUsdc} USDC`],["Wallet USDC",`${data.walletUsdc} USDC`]].map(([label,value])=><div key={label} className="rounded-xl border border-primary-divider p-4 space-y-2"><p className="text-xs text-text-secondary">{label}</p><p className="font-semibold break-all">{value}</p></div>)}</div>
      <p className="text-sm">Subscription access: {data.canSubscribe?"permitted":"not permitted"} · Redemption access: {data.canRedeem?"permitted":"not permitted"}{data.paused?" · Provider paused":""}</p>
      {(!data.canSubscribe || !data.canRedeem) && <p className="text-sm text-text-secondary">Request USYC Arc Testnet access for the company reserve wallet through Circle. Access must be confirmed on-chain before investing. Your approval wallet and payment vault are separate addresses.</p>}
      <p className="text-sm text-text-secondary">{data.executionMessage}</p>
      <div className="flex flex-wrap gap-3"><button disabled className="rounded-lg border border-primary-divider px-3 py-2 text-sm opacity-50">Subscribe USDC</button><button disabled className="rounded-lg border border-primary-divider px-3 py-2 text-sm opacity-50">Redeem USYC</button><a href="https://usyc.docs.hashnote.com/overview/subscription-and-redemption" target="_blank" rel="noreferrer" className="text-sm underline self-center">USYC access and settlement</a></div>
      <p className="text-xs text-text-secondary">Observed block {data.blockNumber} · {data.observedAt}. Oracle updated {data.oracleUpdatedAt||"unavailable"}. Valuation uses the reported price, excludes fees and does not guarantee redemption liquidity. USYC is excluded from spendable USDC.</p>
    </>}
  </section>;
}
