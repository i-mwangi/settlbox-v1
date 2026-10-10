"use client";

import Link from "next/link";
import { GiftCreationForm } from "./GiftCreationForm";
import { GiftAction } from "./GiftAction";
import { useGifts } from "@/services/api/gift";
import { useAuth } from "@/services/auth/context";
import toast from "react-hot-toast";
import Card from "@/components/Common/Card";
import { Badge, BadgeStatus } from "@/components/Common/Badge";

export function GiftStatistics() {
  const query = useGifts();
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";
  return (
    <section className="w-full space-y-5 text-text-primary">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="All Gifts" amount={String(query.data?.length || 0)} />
        <Card
          title="Claimed"
          amount={String(
            query.data?.filter((gift) => gift.status === "claimed").length || 0,
          )}
        />
        <Card
          title="Refunded"
          amount={String(
            query.data?.filter((gift) => gift.status === "refunded").length ||
              0,
          )}
        />
      </div>
      {canManage && <GiftCreationForm />}
      <h2 className="text-xl font-semibold">Funded gift history</h2>
      <p>
        The latest 50 saved gifts are shown. Status is read from the Arc escrow.
      </p>
      {query.isLoading && <p>Loading gifts…</p>}
      {query.error && (
        <p role="alert">
          {query.error.message}{" "}
          <button
            onClick={() => {
              void query.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {!query.isLoading && !query.error && !query.data?.length && (
        <p>No funded gifts yet.</p>
      )}
      {query.data?.map((gift) => (
        <article
          key={gift.id}
          className="space-y-3 rounded-xl border border-primary-divider p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">
              {gift.amount} USDC · {gift.status}
            </p>
            <Badge
              status={
                gift.status === "claimed"
                  ? BadgeStatus.SUCCESS
                  : BadgeStatus.NEUTRAL
              }
              text={gift.status}
            />
          </div>
          <p className="break-all">Recipient: {gift.recipient}</p>
          <p className="break-all">Sender: {gift.sender}</p>
          <p>Expires {new Date(gift.expiresAt * 1000).toLocaleString()}</p>
          <div className="flex flex-wrap gap-4">
            <Link href={`/gift/open-gift?code=${gift.id}`}>Open gift</Link>
            <button
              onClick={() => {
                void navigator.clipboard
                  .writeText(
                    `${window.location.origin}/gift/open-gift?code=${gift.id}`,
                  )
                  .then(() => toast.success("Gift link copied"))
                  .catch(() => toast.error("Gift link could not be copied"));
              }}
            >
              Copy gift link
            </button>
          </div>
          <GiftAction gift={gift} />
        </article>
      ))}
    </section>
  );
}
