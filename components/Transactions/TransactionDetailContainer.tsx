"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useTreasury,
  useApproveTreasuryPayment,
} from "@/services/api/treasury";
import { PaymentLinkLoadError } from "@/components/PaymentLink/PaymentLinkLoadError";
import { formatAmount } from "@/services/arc/amount";
import { Badge, BadgeStatus } from "@/components/Common/Badge";
import { ArcNetworkIcon } from "@/components/Common/ArcNetworkIcon";

export default function TransactionDetailContainer({
  proposalId,
  inModal = false,
}: { proposalId?: string | number; inModal?: boolean } = {}) {
  const [selectedId, setSelectedId] = useState(
    proposalId === undefined ? "" : String(proposalId),
  );
  const treasury = useTreasury();
  const approval = useApproveTreasuryPayment();
  useEffect(() => {
    setSelectedId(
      proposalId === undefined
        ? new URLSearchParams(window.location.search).get("proposalId") || ""
        : String(proposalId),
    );
  }, [proposalId]);
  if (treasury.error)
    return (
      <PaymentLinkLoadError
        error={treasury.error}
        returnTo="/transactions"
        retry={() => {
          void treasury.refetch();
        }}
      />
    );
  if (treasury.isLoading)
    return <p className="p-6 text-text-secondary">Loading transaction…</p>;
  const record = treasury.data?.payments.find(
    (payment) => payment.intent.id === selectedId,
  );
  if (!record)
    return (
      <p className="p-6 text-text-secondary">
        Transaction not found in the company treasury.
      </p>
    );
  const { intent, execution } = record;
  const details = {
    ID: intent.id,
    Purpose: intent.purpose,
    From: treasury.data?.wallet.address || "",
    Recipient: intent.recipient,
    Amount: `${formatAmount(BigInt(intent.amount.baseUnits))} USDC`,
    Network: "Arc Testnet",
    Status: execution.status.replaceAll("_", " "),
    "Transaction hash": execution.transactionHash || "Not available yet",
  };
  return (
    <section className="space-y-5 p-6 text-text-primary">
      {!inModal && <Link href="/transactions">Back to transactions</Link>}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold tracking-tight">
          Transaction details
        </h1>
        <Badge
          status={
            execution.status === "confirmed"
              ? BadgeStatus.SUCCESS
              : execution.status === "failed"
                ? BadgeStatus.FAIL
                : BadgeStatus.AWAITING
          }
          text={execution.status.replaceAll("_", " ")}
        />
      </header>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <article className="flex flex-col gap-5 rounded-2xl border border-primary-divider p-6">
          <p className="text-sm text-text-secondary">Payment amount</p>
          <div className="flex items-center gap-3">
            <img src="/token/usdc.svg" alt="USDC" className="h-9 w-9" />
            <span className="num text-3xl">
              {formatAmount(BigInt(intent.amount.baseUnits))}
            </span>
          </div>
          <p className="text-sm text-text-secondary">USDC</p>
          <div className="border-t border-primary-divider pt-4">
            <p className="flex items-center gap-2 text-sm">
              <ArcNetworkIcon />
              Arc Testnet
            </p>
            <p className="mt-3 text-sm capitalize">{intent.purpose}</p>
          </div>
        </article>
        <dl className="space-y-4 rounded-2xl border border-primary-divider p-6">
          {Object.entries(details)
            .filter(([label]) => !["Amount", "Status"].includes(label))
            .map(([label, value]) => (
              <div
                key={label}
                className="grid gap-2 text-sm sm:grid-cols-[140px_1fr]"
              >
                <dt className="text-text-secondary">{label}</dt>
                <dd className="break-all">{value}</dd>
              </div>
            ))}
        </dl>
      </div>
      <div className="flex gap-4">
        <button
          disabled={treasury.isFetching}
          onClick={() => {
            void treasury.refetch();
          }}
        >
          Check settlement
        </button>
        {execution.status === "awaiting_approval" && (
          <button
            disabled={approval.isPending}
            onClick={() => approval.mutate(intent.id)}
          >
            Approve payment
          </button>
        )}
        {execution.transactionHash && (
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://explorer.testnet.arc.io/tx/${execution.transactionHash}`}
          >
            View in explorer
          </a>
        )}
      </div>
      {approval.error && (
        <p role="alert" className="text-red-600">
          {approval.error.message}
        </p>
      )}
    </section>
  );
}
