"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { NavSections } from "./NavSection";
import { useRouter, usePathname } from "next/navigation";
import { Suspense } from "react";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import { Tooltip } from "react-tooltip";
import { AccountTooltip } from "../Common/ToolTip/AccountTooltip";
import CompanyAvatar from "../Common/CompanyAvatar";
import { EmployeeAvatar } from "../Common/EmployeeAvatar";
import TeamSidebar from "./TeamSidebar";
import EntitySwitcher from "./EntitySwitcher";
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
    Agent = "agent",
    Reimbursement = "reimbursement"
}
export enum SubmenuType {
    Null = "null",
    MoveCrypto = "moveCrypto"
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
        label: "Finance agent",
        isActive: false,
        link: SidebarLink.Agent,
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
export const Sidebar: React.FC<NavProps> = ({ onActionItemClick, collapsed = false, onToggleCollapse }) => {
    const { data, entities, activeEntityId, switchEntity } = useDemo();
    const [action, setActions] = useState(actionItems);
    const router = useRouter();
    const pathname = usePathname();
    const [showTeamSidebar, setShowTeamSidebar] = useState(false);
    const [showEntitySwitcher, setShowEntitySwitcher] = useState(false);
    const entityTriggerRef = useRef<HTMLButtonElement>(null);
    const handleOpenTeamSidebar = useCallback(() => setShowTeamSidebar(true), []);
    const handleCloseTeamSidebar = useCallback(() => setShowTeamSidebar(false), []);
    const handleToggleEntitySwitcher = useCallback(() => setShowEntitySwitcher(prev => !prev), []);
    const handleCloseEntitySwitcher = useCallback(() => setShowEntitySwitcher(false), []);
    const totalBalance = data?.totalBalance ?? 0;
    const teamTotal = data?.teamStats?.total ?? 0;
    useEffect(() => {
        const pendingCount = data?.pendingProposals?.filter(p => p.status === "READY" || p.status === "PENDING").length ?? 0;
        setActions(prev => prev.map(item => {
            const isUrlActive = item.link === SidebarLink.Home
                ? pathname === "/" || pathname === ""
                : pathname?.startsWith(`/${item.link}`);
            const badgeCount = item.link === SidebarLink.Transactions ? pendingCount : item.badgeCount;
            return {
                ...item,
                isActive: !!isUrlActive,
                badgeCount,
            };
        }));
    }, [pathname, data?.pendingProposals]);
    const handleActionItemClick = (itemIndex: number) => {
        const item = action[itemIndex];
        if (item.disabled)
            return;
        setActions(prev => prev.map((a, i) => ({ ...a, isActive: i === itemIndex })));
        onActionItemClick?.(itemIndex);
    };
    const handleSubmenuClick = (_itemIndex: number) => { };
    return (<>
      <nav className="sidebar overflow-visible py-2 rounded-lg w-full relative h-screen z-[70] bg-app-background" style={{ transition: "padding 200ms ease" }}>
        <div className="flex flex-col justify-between h-full">
          <div className="w-full">
            
            <header className={`flex items-center gap-2 px-3 pb-3 border-b border-primary-divider ${collapsed ? "justify-center" : "justify-between"}`}>
              {!collapsed && (<div className="flex min-w-0 cursor-pointer items-center gap-1.5" onClick={() => router.push("/")}>
                  <img src="/logo/settlbox-icon.svg" alt="Settlbox Logo" className="h-7 w-auto shrink-0"/>
                  <span className="text-lg font-semibold">Settlbox</span>
                  <div className="flex shrink-0 items-center justify-start rounded-full bg-[#E7E7E8] px-2 py-0.5">
                    <p className="text-[11px] text-badge-neutral-text">Testnet</p>
                  </div>
                </div>)}
              <button type="button" onClick={onToggleCollapse} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={`flex shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background hover:text-text-primary ${collapsed ? "h-10 w-10" : "h-8 w-8"}`}>
                {collapsed ? <SidebarExpand width={20} height={20}/> : <SidebarCollapse width={20} height={20}/>}
              </button>
            </header>

            
            <div className="relative mx-2 mt-3">
              <button ref={entityTriggerRef} type="button" className={`w-full flex items-center rounded-xl cursor-pointer transition-colors hover:bg-background ${collapsed ? "justify-center px-1 py-2" : "gap-2.5 px-3 py-2.5"}`} onClick={handleToggleEntitySwitcher} title={collapsed ? (data?.company?.companyName ?? "") : undefined}>
                <CompanyAvatar logo={data?.company?.logo ?? null} companyName={data?.company?.companyName ?? ""} size="w-8"/>
                {!collapsed && (<>
                    <span className="flex-1 text-left text-sm font-medium text-text-primary truncate">
                      {data?.company?.companyName ?? "Loading..."}
                    </span>
                    <img src="/arrow/chevron-up-down.svg" alt="switch entity" className="w-4"/>
                  </>)}
              </button>

              <EntitySwitcher entities={entities} activeEntityId={activeEntityId} isOpen={showEntitySwitcher} onClose={handleCloseEntitySwitcher} onSwitch={switchEntity} triggerRef={entityTriggerRef}/>
            </div>

            
            <div className={`mx-2 mb-3 mt-1 rounded-xl bg-background shadow-sm border border-primary-divider cursor-pointer ${collapsed ? "hidden" : ""}`}>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-primary-divider">
                <span className="text-xs text-text-secondary">Total Balance</span>
                <span className="text-sm num">
                  ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <button type="button" className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors hover:bg-app-background rounded-b-xl" onClick={handleOpenTeamSidebar}>
                <div className="flex items-center gap-2">
                  <img src="/misc/user-edit-icon.svg" alt="team" className="w-4"/>
                  <span className="text-xs text-text-secondary">{teamTotal} members</span>
                </div>
                <img src="/arrow/chevron-right.svg" alt="manage" className="w-3 opacity-40"/>
              </button>
            </div>

            
            <NavSections sections={action} collapsed={collapsed} onExpandRequest={onToggleCollapse} onItemClick={handleActionItemClick} onSubmenuClick={handleSubmenuClick}/>
          </div>

          
          <div className={`flex flex-col justify-center border-t border-primary-divider ${collapsed ? "items-center px-2 py-4" : "px-5 py-4"}`}>
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
              {!collapsed && (<div className="flex min-w-0 items-center gap-2.5">
                  <EmployeeAvatar seed={data?.user?.email} name={`${data?.user?.teamMembership?.firstName ?? ""} ${data?.user?.teamMembership?.lastName ?? ""}`.trim()} className="h-9 w-9 shrink-0"/>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13px] font-medium leading-tight text-text-primary truncate">
                      {data?.user?.teamMembership?.firstName} {data?.user?.teamMembership?.lastName}
                    </span>
                    <span className="text-[11px] text-text-secondary leading-tight truncate">{data?.user?.email}</span>
                  </div>
                </div>)}
              <img src="/misc/three-dot-icon.svg" alt="menu" className="w-5 shrink-0 cursor-pointer" data-tooltip-id="account-tooltip" data-tooltip-content="Account"/>
            </div>
          </div>

          <Tooltip id="account-tooltip" clickable style={{ zIndex: 20, borderRadius: "16px", padding: "0" }} place="top" openOnClick noArrow border="none" opacity={1} render={({ content }) => {
            if (!content)
                return null;
            return <AccountTooltip onLogout={async () => { }}/>;
        }}/>
        </div>
      </nav>
      <Suspense fallback={<div>Loading...</div>}>
        <TeamSidebar isOpen={showTeamSidebar} onClose={handleCloseTeamSidebar}/>
      </Suspense>
    </>);
};
export default Sidebar;
