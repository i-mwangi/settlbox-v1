"use client";

import Link from "next/link";
import { useTreasury } from "@/services/api/treasury";
import { formatAmount } from "@/services/arc/amount";

export default function TeamAccountContainer() {
  const query = useTreasury();
  return <section className="space-y-4 rounded-xl border border-primary-divider p-5 text-text-primary"><h2 className="text-xl font-semibold">Company treasury account</h2>{query.isLoading && <p>Loading account…</p>}{query.error && <p role="alert">{query.error.message} <button onClick={() => { void query.refetch(); }}>Retry</button></p>}{query.data && <><p className="break-all">Arc Testnet · {query.data.wallet.address}</p><p>Balance: {formatAmount(BigInt(query.data.balanceBaseUnits))} USDC</p><dl className="space-y-2"><div><dt>Maximum payment</dt><dd>{formatAmount(BigInt(query.data.policy.maxPaymentBaseUnits))} USDC</dd></div><div><dt>Daily payment limit</dt><dd>{formatAmount(BigInt(query.data.policy.dailyLimitBaseUnits))} USDC</dd></div><div><dt>Approval threshold</dt><dd>{formatAmount(BigInt(query.data.policy.approvalThresholdBaseUnits))} USDC</dd></div><div><dt>Required independent approvals</dt><dd>{query.data.policy.requiredApprovals}</dd></div></dl><p>Payment limits and approved recipients are enforced when the treasury releases funds. Account settings do not change these controls.</p><Link href="/testnet-treasury" className="text-primary-blue">Review treasury payments</Link></>}</section>;
}
