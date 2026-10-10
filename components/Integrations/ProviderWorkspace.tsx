"use client";

import { PrimaryButton } from "@/components/Common/PrimaryButton";
import { Table } from "@/components/Common/Table";
import { Badge, BadgeStatus } from "@/components/Common/Badge";

interface ProviderWorkspaceProps {
  title: string;
  subtitle: string;
  actions: string[];
  stats: string[];
  collectionTitle: string;
  activityHeaders: string[];
  description: string;
}

export function ProviderWorkspace({
  title,
  subtitle,
  actions,
  stats,
  collectionTitle,
  activityHeaders,
  description,
}: ProviderWorkspaceProps) {
  return (
    <section className="flex h-full w-full flex-col overflow-y-auto text-text-primary">
      <header className="flex flex-wrap items-start justify-between gap-4 px-6 pb-3 pt-6">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          {actions.map((action) => (
            <PrimaryButton
              key={action}
              text={action}
              disabled
              containerClassName="w-fit"
            />
          ))}
        </div>
      </header>
      <div className="grid gap-3 px-6 py-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat}
            className="flex min-h-[100px] flex-col justify-between gap-3 rounded-xl border border-primary-divider p-4"
            style={{
              backgroundImage: "url(/card/background.svg)",
              backgroundPosition: "right",
              backgroundRepeat: "no-repeat",
              backgroundSize: "30%",
            }}
          >
            <p className="text-sm text-text-secondary">{stat}</p>
            <p className="num text-2xl">—</p>
          </article>
        ))}
      </div>
      <div className="mx-6 my-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary-divider bg-app-background p-4">
        <Badge status={BadgeStatus.NEUTRAL} text="Not connected" />
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <div className="space-y-3 px-6 py-3">
        <h2 className="text-lg font-semibold">{collectionTitle}</h2>
        <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-primary-divider bg-background p-6">
          <div className="space-y-3 text-center">
            <img
              src="/logo/settlbox-icon.svg"
              alt=""
              className="mx-auto h-10 opacity-25"
            />
            <p className="text-sm text-text-secondary">
              No records yet. Connect a provider to get started.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4 px-6 pb-6 pt-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        <Table
          headers={activityHeaders}
          data={[]}
          noDataMessage="No activity yet."
        />
      </div>
    </section>
  );
}
