"use client";

import { useState } from "react";
import SettingHeader from "./SettingHeader";
import { Badge, BadgeStatus } from "@/components/Common/Badge";

export function IntegrationSettingsPanel({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: { title: string; description: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? features : features.slice(0, 3);
  return (
    <section className="flex max-w-2xl flex-col gap-4 text-text-primary">
      <SettingHeader
        title={title}
        icon={
          title === "Slack" ? "/misc/slack-icon.svg" : "/misc/company-icon.svg"
        }
      />
      <div className="space-y-6 rounded-2xl border border-primary-divider p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Connect {title}</h2>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
          <Badge status={BadgeStatus.NEUTRAL} text="Not connected" />
        </div>
        <button
          disabled
          className="w-fit rounded-lg bg-text-primary px-4 py-2 text-sm text-background opacity-50"
        >
          Connect {title}
        </button>
        <p className="text-xs text-text-secondary">
          Provider authorization must be configured to enable this connection.
        </p>
        <div className="space-y-4 border-t border-primary-divider pt-5">
          <h3 className="font-semibold">How it works</h3>
          {visible.map((feature, index) => (
            <article
              key={feature.title}
              className="flex gap-3 rounded-xl border border-primary-divider bg-app-background p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary-divider bg-background text-xs font-semibold">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{feature.title}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
          {features.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full rounded-lg border border-primary-divider py-2 text-sm"
            >
              {expanded ? "Show less" : "Show more features"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
