"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useArcGift } from "@/services/api/gift";
import { GiftAction } from "./GiftAction";
import { Badge, BadgeStatus } from "@/components/Common/Badge";

export default function OpenGiftContainer() {
  const id = useSearchParams().get("code") || "";
  const query = useArcGift(id);
  const claimed = query.data?.status === "claimed";
  return (
    <main
      className={`relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden p-6 ${claimed ? "bg-[#066EFF]" : "bg-app-background"}`}
    >
      <Link
        href="/"
        aria-label="Settlbox home"
        className="absolute left-6 top-6 z-10"
      >
        <img
          src="/logo/settlbox-wordmark.svg"
          alt="Settlbox"
          className="h-8 w-auto"
        />
      </Link>
      <img
        src="/gift/background-settlbox-text.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 w-[1050px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-15"
      />
      <div className="relative z-10 my-12 flex w-full max-w-[520px] flex-col items-center gap-5">
        {claimed && (
          <h1 className="text-5xl font-bold uppercase text-white">Congrats</h1>
        )}
        <section className="w-full space-y-5 rounded-[32px] border border-primary-divider bg-background p-6 text-center text-text-primary shadow-lg">
          <img
            src={
              claimed
                ? "/gift/open-gift/settlbox-coin.svg"
                : "/gift/generate-box-gift.svg"
            }
            alt="Settlbox gift"
            className="mx-auto h-[170px] max-w-full object-contain"
          />
          <h1 className="text-2xl font-semibold">
            {claimed ? "You have received" : "Your Settlbox gift"}
          </h1>
          {!id && <p>A gift link is required.</p>}
          {query.isLoading && (
            <p className="text-sm text-text-secondary">Reading gift escrow…</p>
          )}
          {query.error && (
            <p role="alert" className="text-sm">
              {query.error.message}{" "}
              <button
                onClick={() => {
                  void query.refetch();
                }}
                className="text-primary-blue"
              >
                Retry
              </button>
            </p>
          )}
          {query.data && (
            <>
              <div className="flex items-center justify-center gap-3">
                <img src="/token/usdc.svg" alt="USDC" className="h-10 w-10" />
                <p className="num text-4xl font-semibold">
                  {query.data.amount}
                </p>
              </div>
              <p className="text-sm text-text-secondary">USDC · Arc Testnet</p>
              <div className="flex justify-center">
                <Badge
                  status={claimed ? BadgeStatus.SUCCESS : BadgeStatus.NEUTRAL}
                  text={query.data.status}
                />
              </div>
              <dl className="space-y-3 rounded-2xl bg-app-background p-4 text-left text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">From</dt>
                  <dd title={query.data.sender}>
                    {query.data.sender.slice(0, 8)}…
                    {query.data.sender.slice(-6)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Recipient</dt>
                  <dd title={query.data.recipient}>
                    {query.data.recipient.slice(0, 8)}…
                    {query.data.recipient.slice(-6)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Expires</dt>
                  <dd>
                    {new Date(query.data.expiresAt * 1000).toLocaleString()}
                  </dd>
                </div>
              </dl>
              <GiftAction gift={query.data} />
              <p className="text-xs leading-5 text-text-secondary">
                Only the recipient wallet can claim. Arc Testnet USDC is
                required for transaction fees.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
