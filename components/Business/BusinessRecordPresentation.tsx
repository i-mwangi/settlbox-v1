"use client";

import type { BusinessRecord } from "@/types/business";
import { useGetMyCompany } from "@/services/api/company";
import { Badge, BadgeStatus } from "@/components/Common/Badge";

export function BusinessRecordPresentation({
  record,
}: {
  record: BusinessRecord;
}) {
  const company = useGetMyCompany();
  const companyName = company.data?.companyName || "Company workspace";
  const inbound = record.kind === "invoice";
  const status =
    record.status === "paid"
      ? BadgeStatus.SUCCESS
      : record.status === "failed"
        ? BadgeStatus.FAIL
        : record.status === "draft"
          ? BadgeStatus.NEUTRAL
          : BadgeStatus.AWAITING;
  const dates = [
    {
      label: "Created on",
      value: new Date(record.createdAt).toLocaleDateString(),
    },
    { label: "Amount", value: `${record.amount} USDC` },
    { label: "Due date", value: record.dueDate },
    { label: "Currency", value: "USDC" },
  ];
  return (
    <article className="space-y-5 rounded-2xl border border-primary-divider bg-background p-6">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">{record.title}</h2>
        <Badge status={status} text={record.status.replaceAll("_", " ")} />
      </header>
      <div className="grid gap-3 lg:grid-cols-2">
        <dl className="space-y-4 rounded-2xl border border-primary-divider p-5">
          {dates.map((item) => (
            <div
              key={item.label}
              className="grid gap-2 text-sm sm:grid-cols-[130px_1fr]"
            >
              <dt className="text-text-secondary">{item.label}</dt>
              <dd className="num">{item.value}</dd>
            </div>
          ))}
        </dl>
        <dl className="space-y-4 rounded-2xl border border-primary-divider p-5">
          <div className="grid gap-2 text-sm sm:grid-cols-[130px_1fr]">
            <dt className="text-text-secondary">From</dt>
            <dd>{inbound ? companyName : record.counterparty}</dd>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-[130px_1fr]">
            <dt className="text-text-secondary">
              {inbound ? "Billed to" : "Paid by"}
            </dt>
            <dd>{inbound ? record.counterparty : companyName}</dd>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-[130px_1fr]">
            <dt className="text-text-secondary">Payment method</dt>
            <dd className="flex items-center gap-2">
              <img src="/token/usdc.svg" alt="USDC" className="h-5 w-5" />
              USDC (Arc Testnet)
            </dd>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-[130px_1fr]">
            <dt className="text-text-secondary">
              {inbound ? "Collection address" : "Recipient address"}
            </dt>
            <dd className="break-all">{record.recipient}</dd>
          </div>
        </dl>
      </div>
      <h3 className="text-xl font-semibold">Summary</h3>
      <div className="overflow-hidden rounded-2xl border border-primary-divider">
        <div className="flex justify-between gap-4 border-b border-primary-divider bg-app-background px-5 py-3 text-sm text-text-secondary">
          <span>Item details</span>
          <span>Amount</span>
        </div>
        <div className="flex flex-wrap justify-between gap-4 px-5 py-4 text-sm">
          <p className="whitespace-pre-wrap">{record.description}</p>
          <span className="num whitespace-nowrap">{record.amount} USDC</span>
        </div>
        <div className="flex justify-end gap-8 border-t border-primary-divider px-5 py-4 text-sm">
          <span>Subtotal</span>
          <span className="num font-semibold">{record.amount} USDC</span>
        </div>
        <div className="flex justify-end gap-8 border-t border-primary-divider bg-primary-blue/5 px-5 py-4 text-sm">
          <span>{record.status === "paid" ? "Amount paid" : "Amount due"}</span>
          <span className="num font-semibold">{record.amount} USDC</span>
        </div>
      </div>
      {record.receiptUrls?.length ? (
        <div className="flex flex-wrap gap-3">
          {record.receiptUrls.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-primary-divider px-3 py-2 text-sm text-primary-blue"
            >
              Receipt {index + 1}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}
