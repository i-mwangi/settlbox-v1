"use client";

import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis } from "recharts";
import { PeriodFilterDropdown } from "./Overview/PeriodFilterDropdown";

const balances = [
  600018, 607100, 610300, 619000, 625200, 630500, 634100, 639000, 650200,
  661050,
];
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
];
const navigation = [
  "Dashboard",
  "Contact",
  "Receive",
  "Bills",
  "Payment Link",
  "Transactions",
  "Expenses",
  "Cashout",
  "Earn",
  "Setting",
];

export function DashboardPreview({ onSignOut }: { onSignOut: () => void }) {
  const [period, setPeriod] = useState<"year" | "month" | "week" | "day">(
    "year",
  );
  const points = balances
    .slice(
      period === "year"
        ? 0
        : period === "month"
          ? -4
          : period === "week"
            ? -3
            : -2,
    )
    .map((balance, index) => ({
      label: period === "year" ? months[index] : `${index + 1}`,
      balance,
    }));
  return (
    <div className="flex min-h-screen w-full bg-app-background text-text-primary">
      <aside className="hidden w-[228px] shrink-0 border-r border-primary-divider p-3 lg:block">
        <div className="flex items-center gap-2 pb-6">
          <img src="/logo/settlbox-icon.svg" alt="" className="h-7 w-7" />
          <span className="text-xl font-semibold">Settlbox</span>
        </div>
        <p className="py-4 text-center">Demo company</p>
        <div className="rounded-xl border border-primary-divider bg-background p-3 text-sm">
          Total Balance <strong className="float-right">$661,050.00</strong>
          <p className="mt-4 border-t border-primary-divider pt-2 text-text-secondary">
            3 members
          </p>
        </div>
        <nav className="mt-4 space-y-1">
          {navigation.map((item) => (
            <div
              key={item}
              className={`rounded-lg px-3 py-3 text-sm ${item === "Dashboard" ? "bg-background" : "text-text-secondary"}`}
            >
              {item}
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>Dashboard › Overview</span>
          <span className="text-text-secondary">
            Preview · Sample data · No payment actions
          </span>
          <button
            onClick={onSignOut}
            className="rounded-lg border border-primary-divider px-3 py-2"
          >
            Sign out of preview
          </button>
        </div>
        <div className="rounded-t-2xl bg-background p-6">
          <h1 className="text-[26px] font-bold">Dashboard</h1>
          <p className="text-sm text-text-secondary">
            A quick overview of your treasury, payroll, and recent activity.
          </p>
          <div className="my-4 flex gap-6 border-b border-primary-divider pb-3 text-sm">
            <span className="rounded-lg bg-text-primary px-4 py-2 text-background">
              Overview
            </span>
            <span className="py-2 text-text-secondary">
              Accounting & Reports
            </span>
            <span className="py-2 text-text-secondary">
              Transaction History
            </span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-primary-divider p-5">
              <p className="text-xs text-text-secondary">
                TOTAL TREASURY BALANCE
              </p>
              <p className="my-3 text-3xl">$600,018.50</p>
              <p className="mt-6 border-t border-primary-divider pt-3 text-xs">
                100% USDC
              </p>
              <div className="mt-2 h-2 rounded-full bg-[#2775ca]" />
            </section>
            <section className="flex flex-wrap justify-between gap-5 rounded-2xl border border-primary-divider p-5">
              <div>
                <p className="text-xs text-text-secondary">UPCOMING PAYROLL</p>
                <p className="my-3 text-3xl">
                  $31,000{" "}
                  <span className="text-sm text-text-secondary">3 Payees</span>
                </p>
                <p className="mt-6 text-xs">Due on Apr 2026</p>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-xs text-text-secondary">SCHEDULE</p>
                {["Engineering", "Design & Product", "Contractors"].map(
                  (name, index) => (
                    <p key={name}>
                      {name}{" "}
                      <span className="ml-5">
                        ${["16,500", "9,300", "5,200"][index]}
                      </span>
                    </p>
                  ),
                )}
              </div>
            </section>
          </div>
          <section className="my-4 rounded-2xl border border-primary-divider p-5">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary">Total Balance</span>
              <PeriodFilterDropdown period={period} onChange={setPeriod} />
            </div>
            <div className="mt-8 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-4xl">$661,050</p>
                <p className="text-sm text-green-600">+$61,031.50</p>
              </div>
              <div className="h-[180px] min-w-[250px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points}>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <Area dataKey="balance" stroke="#414b5d" fill="#e9ebee" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-primary-divider p-5">
              <h2 className="mb-3 text-lg">Quick Stats</h2>
              <div className="rounded-2xl bg-app-background p-4">
                <p className="text-sm text-text-secondary">Earn</p>
                <p className="mt-2 text-3xl">$150,000.00</p>
                <p className="mt-2 text-xs text-green-600">
                  +$3,812.50 earned · Sample data
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {["Card Pool Balance", "Pending Actions"].map((name, index) => (
                  <div key={name} className="rounded-2xl bg-app-background p-4">
                    <p className="text-sm text-text-secondary">{name}</p>
                    <p className="mt-2 text-2xl">{index ? "2" : "$12,500"}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-primary-divider p-5">
              <h2 className="mb-6 text-lg">All Accounts</h2>
              <div className="flex flex-wrap items-center gap-8">
                <div
                  className="flex h-40 w-40 items-center justify-center rounded-full"
                  style={{
                    background:
                      "conic-gradient(#6561fa 0% 73%, #3479fa 73% 100%)",
                  }}
                >
                  <div className="h-20 w-20 rounded-full bg-background" />
                </div>
                <div className="flex-1 space-y-4 text-sm">
                  <p className="border-b border-primary-divider pb-3 text-text-secondary">
                    Weight · Account · Balance
                  </p>
                  <p>
                    73% Protocol Treasury{" "}
                    <span className="float-right">$481,050</span>
                  </p>
                  <p>
                    27% Grants and Runway{" "}
                    <span className="float-right">$180,000</span>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
