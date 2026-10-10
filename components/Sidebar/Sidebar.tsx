"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { NavSections } from "./NavSection";
import { useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useGetMyCompany } from "@/services/api/company";
import { useTreasury } from "@/services/api/treasury";
import { formatAmount } from "@/services/arc/amount";
import { displayUsdc } from "@/services/arc/display";
import { useGetCompanyTeamMembers } from "@/services/api/team-member";
import { useAuth } from "@/services/auth/context";
import { Tooltip } from "react-tooltip";
import { AccountTooltip } from "../Common/ToolTip/AccountTooltip";
import CompanyAvatar from "../Common/CompanyAvatar";
import { EmployeeAvatar } from "../Common/EmployeeAvatar";
import TeamSidebar from "./TeamSidebar";
import { SidebarCollapse, SidebarExpand } from "iconoir-react";

export const MOVE_CRYPTO_SIDEBAR_OFFSET = 238;

interface NavProps {
  onActionItemClick?: (itemIndex: number) => void;
  onTeamItemClick?: (index: number) => void;
  onConnectWallet?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export enum SidebarLink {
  Home = "",
  MoveCrypto = "move-crypto",
  PaymentLink = "payment-link",
  Dashboard = "dashboard",
  Send = "send",
  ContactBook = "contact-book",
  Payroll = "payroll",
  Gift = "gift",
  AIAssistant = "ai-assistant",
  GroupPayment = "group-payment",
  AddressBook = "address-book",
  AccountManagement = "account-management",
  Transactions = "transactions",
  Bill = "bill",
  Invoice = "invoice",
  Setting = "setting",
  CreditCard = "credit-card",
  Card = "card",
  Ramp = "ramp",
  Reports = "reports",
  Treasury = "treasury",
  Client = "client",
  GlobalAccount = "global-account",
  Earn = "earn",
  Reimbursement = "reimbursement",
}

export enum SubmenuType {
  Null = "null",
  MoveCrypto = "moveCrypto",
}

export const actionItems = [
  {
    icon: "/sidebar/home.svg",
    filledIcon: "/sidebar/filled-home.svg",
    label: "Dashboard",
    isActive: true,
    link: SidebarLink.Home,
    disabled: false,
    hasSubmenu: false,
    submenuType: SubmenuType.Null,
    badgeCount: 0,
  },
  {
    icon: "/misc/team-icon.svg",
    filledIcon: "/misc/team-icon.svg",
    label: "Employee",
    isActive: false,
    link: SidebarLink.ContactBook,
    disabled: false,
    badgeCount: 0,
    group: "Contact",
    groupIcon: "/sidebar/contact-book.svg",
    groupFilledIcon: "/sidebar/filled-contact-book.svg",
  },
  {
    icon: "/sidebar/invoice.svg",
    filledIcon: "/sidebar/filled-invoice.svg",
    label: "Invoice",
    isActive: false,
    link: SidebarLink.Invoice,
    disabled: false,
    badgeCount: 0,
    group: "Receive",
    groupIcon: "/sidebar/invoice.svg",
    groupFilledIcon: "/sidebar/filled-invoice.svg",
  },
  {
    icon: "/misc/company-icon.svg",
    filledIcon: "/misc/company-icon.svg",
    label: "Clients",
    isActive: false,
    link: SidebarLink.Client,
    disabled: false,
    badgeCount: 0,
    group: "Contact",
  },
  {
    icon: "/sidebar/global-account.svg",
    filledIcon: "/sidebar/filled-global-account.svg",
    label: "Global Account",
    isActive: false,
    link: SidebarLink.GlobalAccount,
    disabled: false,
    badgeCount: 0,
    group: "Receive",
  },
  {
    icon: "/sidebar/bill.svg",
    filledIcon: "/sidebar/filled-bill.svg",
    label: "Bills",
    isActive: false,
    link: SidebarLink.Bill,
    disabled: false,
    badgeCount: 0,
  },
  {
    icon: "/sidebar/payment-link.svg",
    filledIcon: "/sidebar/filled-payment-link.svg",
    label: "Payment Link",
    isActive: false,
    link: SidebarLink.PaymentLink,
    disabled: false,
    badgeCount: 0,
  },
  {
    icon: "/sidebar/transactions.svg",
    filledIcon: "/sidebar/filled-transactions.svg",
    label: "Transactions",
    isActive: false,
    link: SidebarLink.Transactions,
    disabled: false,
    badgeCount: 0,
  },
  {
    icon: "/sidebar/credit-card.svg",
    filledIcon: "/sidebar/filled-credit-card.svg",
    label: "Corporate Card",
    isActive: false,
    link: SidebarLink.Card,
    disabled: false,
    badgeCount: 0,
    group: "Expenses",
    groupIcon: "/sidebar/credit-card.svg",
    groupFilledIcon: "/sidebar/filled-credit-card.svg",
  },
  {
    icon: "/sidebar/bill.svg",
    filledIcon: "/sidebar/filled-bill.svg",
    label: "Reimbursement",
    isActive: false,
    link: SidebarLink.Reimbursement,
    disabled: false,
    badgeCount: 0,
    group: "Expenses",
  },
  {
    icon: "/sidebar/payroll.svg",
    filledIcon: "/sidebar/filled-payroll.svg",
    label: "Cashout",
    isActive: false,
    link: SidebarLink.Ramp,
    disabled: false,
    badgeCount: 0,
  },
  {
    icon: "/sidebar/earn.svg",
    filledIcon: "/sidebar/filled-earn.svg",
    label: "Earn",
    isActive: false,
    link: SidebarLink.Earn,
    disabled: false,
    badgeCount: 0,
  },
  {
    icon: "/sidebar/setting.svg",
    filledIcon: "/sidebar/filled-setting.svg",
    label: "Setting",
    isActive: false,
    link: SidebarLink.Setting,
    disabled: false,
    badgeCount: 0,
  },
];

export const Sidebar: React.FC<NavProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const profile = useGetMyCompany();
  const treasury = useTreasury();
  const { logout, user } = useAuth();
  const team = useGetCompanyTeamMembers();
  const sections = actionItems.map((item) => ({
    ...item,
    isActive:
      item.link === SidebarLink.Home
        ? pathname === "/"
        : pathname.startsWith(`/${item.link}`),
    badgeCount:
      item.link === SidebarLink.Transactions
        ? (treasury.data?.payments || []).filter(
            (payment) => payment.execution.status === "awaiting_approval",
          ).length
        : 0,
  }));
  return (
    <nav className="flex h-screen w-full flex-col overflow-y-auto bg-app-background text-text-primary">
      <header className="flex items-center justify-between border-b border-primary-divider px-3 py-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo/settlbox-icon.svg" alt="Settlbox" className="h-7" />
          {!collapsed && (
            <span className="text-lg font-semibold">Settlbox</span>
          )}
        </Link>
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <SidebarExpand /> : <SidebarCollapse />}
        </button>
      </header>
      <Link
        href="/setting?tab=company"
        className="mx-2 my-3 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-background"
      >
        <CompanyAvatar
          logo={profile.data?.logo || null}
          companyName={profile.data?.companyName || "Company workspace"}
          size="w-8"
        />
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {profile.data?.companyName || "Company workspace"}
          </span>
        )}
      </Link>
      {!collapsed && (
        <div className="mx-2 mb-3 rounded-xl border border-primary-divider bg-background shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-primary-divider px-3 py-2.5">
            <span className="text-xs text-text-secondary">Total Balance</span>
            <span
              className="num whitespace-nowrap text-xs"
              title={
                treasury.data
                  ? `${formatAmount(BigInt(treasury.data.balanceBaseUnits))} USDC`
                  : undefined
              }
            >
              {treasury.data
                ? `${displayUsdc(BigInt(treasury.data.balanceBaseUnits))} USDC`
                : "—"}
            </span>
          </div>
          <Link
            href="/setting?tab=team"
            className="flex items-center justify-between px-3 py-2.5"
          >
            <span className="flex items-center gap-2 text-xs text-text-secondary">
              <img src="/misc/user-edit-icon.svg" alt="" className="h-4 w-4" />
              {team.data ? `${team.data.length} members` : "Manage team"}
            </span>
            <img
              src="/arrow/chevron-right.svg"
              alt=""
              className="w-3 opacity-40"
            />
          </Link>
        </div>
      )}
      <div className="px-2">
        <NavSections
          sections={sections}
          collapsed={collapsed}
          onExpandRequest={onToggleCollapse}
        />
      </div>
      <div className="mt-auto flex items-center gap-2 border-t border-primary-divider px-3 py-4">
        {!collapsed && (
          <>
            <EmployeeAvatar
              name={`${user?.teamMembership.firstName || ""} ${user?.teamMembership.lastName || ""}`}
              seed={user?.email}
              className="h-9 w-9 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">
                {user?.teamMembership.firstName} {user?.teamMembership.lastName}
              </p>
              <p className="truncate text-[11px] text-text-secondary">
                {user?.email || user?.role}
              </p>
            </div>
          </>
        )}
        <button
          onClick={() => {
            void logout();
          }}
          aria-label="Sign out"
        >
          <img
            src="/misc/power-button-icon.svg"
            alt="Sign out"
            className="h-5 w-5"
          />
        </button>
      </div>
    </nav>
  );
};
