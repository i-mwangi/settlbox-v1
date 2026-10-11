"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentPlanRequest, AgentRun } from "@/types/agent";
import type { TreasuryVaultStatus } from "@/types/treasury-vault";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import HumanWallet from "./HumanWallet";
import VaultPayments, { QueueVaultPayment } from "./VaultPayments";
import Automation from "./Automation";

export default function AgentPage() {
  const { activeEntityId } = useDemo();
  const enabled = activeEntityId === "entity-3";
  const client = useQueryClient();
  const [throughDate, setThroughDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [reserveUsdc, setReserveUsdc] = useState("0");
  const [pendingRequest, setPendingRequest] = useState<AgentPlanRequest | null>(null);
  const history = useQuery({ queryKey: ["agent-runs"], enabled, queryFn: () => workspaceFetch<AgentRun[]>("/api/agent-runs"), retry: false });
  const vault = useQuery({ queryKey: ["treasury-vault"], enabled, queryFn: () => workspaceFetch<TreasuryVaultStatus>("/api/treasury/vault"), retry: false, staleTime: 0 });
  const prepare = useMutation({
    mutationFn: (request: AgentPlanRequest) => workspaceFetch<AgentRun>("/api/agent-runs", "POST", request),
    onSuccess: async () => { setPendingRequest(null); await client.invalidateQueries({ queryKey: ["agent-runs"] }); },
  });
  const run = history.data?.[0];
  const submit = () => {
    const request = pendingRequest ?? { requestId: crypto.randomUUID(), throughDate, reserveUsdc };
    setPendingRequest(request);
    prepare.mutate(request);
  };
  return <section className="w-full p-6 space-y-6">
    <header>
      <h1 className="text-2xl font-semibold text-text-primary">Finance agent</h1>
      <p className="text-sm text-text-secondary">Prepare a review plan from saved obligations and the connected company treasury.</p>
    </header>
    {enabled && <div className="rounded-2xl border border-primary-divider bg-background p-5 space-y-3">
      <h2 className="text-lg font-semibold">Treasury vault</h2>
      {vault.isLoading && <p role="status" className="text-sm text-text-secondary">Checking vault status…</p>}
      {vault.error && <p role="alert" className="text-red-600 text-sm">{vault.error.message}</p>}
      {vault.data?.state === "not_configured" && <p className="text-sm text-text-secondary">{vault.data.message}</p>}
      {vault.data?.state === "verified" && <>
        <p className="text-sm">Verified on Arc Testnet · {vault.data.paused ? "Paused" : "Enabled"} · {vault.data.balanceUsdc} USDC held by the vault</p>
        <p className="text-sm text-text-secondary break-all">Vault: {vault.data.address}</p>
        <p className="text-sm text-text-secondary">Payment limit: {vault.data.policy.paymentLimitUsdc} USDC · Daily limit: {vault.data.policy.dailyLimitUsdc} USDC · Required approvals above {vault.data.policy.approvalThresholdUsdc} USDC: {vault.data.policy.requiredApprovals}</p>
        {!vault.data.approvalCapacityReady && <p className="text-sm text-red-600">The configured number of approvers is not available.</p>}
        <p className="text-sm text-text-secondary">Observed at block {vault.data.blockNumber}. Contract rules cover funds held by this vault. Circle execution requires a queued obligation and valid on-chain approvals.</p>
      </>}
    </div>}
    {enabled && <HumanWallet administrator={vault.data?.state === "verified" ? vault.data.administrator : undefined} />}
    {enabled && <VaultPayments />}
    {enabled && <Automation />}
    <div className="rounded-2xl border border-primary-divider bg-background p-5 space-y-4">
      <p className="text-sm text-text-secondary">Preparing a plan sends no payments. Vault queueing and execution are separate actions; required approvals are signed through Circle.</p>
      <p className="text-sm text-text-secondary">Vault plans use only funds held by the vault. The contract liquidity floor is reserved separately from the additional amount below.</p>
      {!enabled && <p role="status">Select the company treasury workspace to prepare a plan.</p>}
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2 text-sm">Plan through
          <input aria-label="Plan through" type="date" value={throughDate} disabled={prepare.isPending} onChange={event => { setThroughDate(event.target.value); setPendingRequest(null); }} className="rounded-lg border border-primary-divider p-2 bg-background" />
        </label>
        <label className="flex flex-col gap-2 text-sm">Additional liquidity reserve (USDC)
          <input aria-label="Additional liquidity reserve (USDC)" inputMode="decimal" value={reserveUsdc} disabled={prepare.isPending} onChange={event => { setReserveUsdc(event.target.value); setPendingRequest(null); }} className="rounded-lg border border-primary-divider p-2 bg-background" />
        </label>
        <button disabled={!enabled || prepare.isPending} onClick={submit} className="rounded-lg bg-[#1b1b1b] text-white px-4 py-2 disabled:opacity-50">{prepare.isPending ? "Preparing…" : pendingRequest ? "Retry plan" : "Prepare plan"}</button>
      </div>
      {(history.error || prepare.error) && <p role="alert" className="text-red-600">{prepare.error?.message ?? history.error?.message}</p>}
    </div>
    {enabled && run && <div className="rounded-2xl border border-primary-divider bg-background p-5 space-y-4">
      <h2 className="text-lg font-semibold">Latest plan</h2>
      <p className="text-sm text-text-secondary">Saved {new Date(run.createdAt).toLocaleString()} · Plan through {run.request.throughDate}</p>
      {run.aiReview && <div className="rounded-xl border border-primary-divider p-4 space-y-2">
        <h3 className="font-semibold">AI finance review</h3>
        <p className="text-sm text-text-secondary">Azure · {run.aiReview.model} · Advisory only</p>
        <p className="text-sm whitespace-pre-wrap">{run.aiReview.summary}</p>
      </div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[ [run.fundingSource === "treasury_vault" ? "Observed vault balance" : "Observed treasury balance", run.balanceUsdc], ["Obligations through planning date", run.obligationsUsdc], ["Additional liquidity reserve", run.reserveUsdc] ].map(([label, amount]) => <div key={label} className="rounded-xl border border-primary-divider p-4"><p className="text-sm text-text-secondary">{label}</p><p className="font-semibold break-all">{amount} USDC</p></div>)}
      </div>
      <p className="text-sm text-text-secondary">This is a saved snapshot. Payment execution must recheck the current balance, policy and approvals. Historical sample balances are excluded.</p>
      {run.actions.length === 0 ? <p>No canonical obligations or receivables fall within this period.</p> : <ul className="divide-y divide-primary-divider">{run.actions.map(action => <li key={action.recordId} className="py-4 space-y-1">
        <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{action.title}</span><span>{action.amountUsdc} USDC · {action.disposition === "blocked" ? "Blocked" : "Review required"}</span></div>
        <p className="text-sm text-text-secondary">{action.kind} · {action.dueDate} · {action.reasons.join(". ")}</p>
        {action.tool === "review_payment" && action.disposition === "review" && <QueueVaultPayment runId={run.id} recordId={action.recordId} />}
      </li>)}</ul>}
      <a href="/transactions" className="text-primary-blue text-sm">Open payment approvals</a>
    </div>}
    {enabled && history.isLoading && <p role="status">Loading saved runs…</p>}
    {enabled && !history.isLoading && !history.error && !run && <p>No planning runs yet.</p>}
  </section>;
}
