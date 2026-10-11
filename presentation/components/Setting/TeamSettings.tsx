"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/presentation/services/auth/context";
import { PrimaryButton } from "../Common/PrimaryButton";
import { TabContainer } from "../Common/TabContainer";
import Card from "../Common/Card";
import AccountTab, { Account } from "./TeamSetting/AccountTab";
import MemberTab from "./TeamSetting/MemberTab";
import InvoiceSettingsTab from "./TeamSetting/InvoiceSettingsTab";
import { useModal } from "@/presentation/contexts/ModalManagerProvider";
import { useGetMyCompany } from "@/presentation/services/api/company";
import { useListAccountsByCompany } from "@/presentation/services/api/multisig";
import CompanyAvatar from "../Common/CompanyAvatar";
import { useGetTeamStats } from "@/presentation/services/api/team-member";
const TeamSettings = () => {
    const { openModal } = useModal();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"account" | "member" | "invoice">("account");
    const { data: myCompany } = useGetMyCompany();
    const { data: multisigAccounts, isLoading: accountsLoading } = useListAccountsByCompany(myCompany?.id, {
        enabled: !!myCompany?.id,
    });
    const { data: teamStats } = useGetTeamStats(myCompany?.id);
    const isAdmin = user?.teamMembership?.role === "ADMIN" || user?.teamMembership?.role === "OWNER";
    const accounts: Account[] = (multisigAccounts || []).map(a => ({
        id: a.accountId,
        name: a.name,
        description: a.description || `Threshold ${a.threshold} · ${a.publicKeys?.length ?? a.members?.length ?? 0} approvers`,
        memberCount: a.publicKeys?.length ?? a.members?.length ?? 0,
        logo: a.logo ? a.logo : "/client-invoice/payroll-icon.svg",
    }));
    const handleCreateNewAccount = () => {
        openModal("CREATE_ACCOUNT");
    };
    const handleMenuClick = (accountId: string) => {
        console.log("Menu clicked for account:", accountId);
    };
    const renderTabContent = () => {
        switch (activeTab) {
            case "account":
                return (<AccountTab accounts={accounts} onCreateNewAccount={handleCreateNewAccount} onMenuClick={handleMenuClick} isAdmin={isAdmin}/>);
            case "member":
                return <MemberTab onMenuClick={handleMenuClick}/>;
            case "invoice":
                return <InvoiceSettingsTab />;
        }
    };
    return (<div className="flex flex-col gap-5 w-full">
      
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <CompanyAvatar logo={myCompany?.logo} companyName={myCompany?.companyName} size="w-12"/>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">
              {myCompany?.companyName}
            </h1>
            <p className="text-[14px] text-text-secondary">
              Manage multi-owner accounts, company members, and invoice settings.
            </p>
          </div>
        </div>
        {isAdmin && (<PrimaryButton text="Add new members" onClick={() => openModal("INVITE_TEAM_MEMBER")} containerClassName="w-fit shrink-0" buttonClassName="whitespace-nowrap"/>)}
      </div>

      
      <div className="flex w-full flex-row gap-2">
        <Card title="Accounts" amount={accounts.length.toString()} info="Admins can submit proposals and cast votes."/>
        <Card title="Members" amount={teamStats?.total?.toString() || "0"} info={`${teamStats?.historical || 0} historical profiles; ${teamStats?.active || 0} active workspace members.`}/>
      </div>

      
      <div className="flex w-full items-center justify-between gap-2 border-b border-primary-divider pb-3">
        <TabContainer tabs={[
            { id: "account", label: "Multi-Owner Accounts" },
            { id: "member", label: "Company Member" },
            { id: "invoice", label: "Invoice Settings" },
        ]} activeTab={activeTab} setActiveTab={tab => setActiveTab(tab as "account" | "member" | "invoice")} textSize="sm"/>
        {activeTab !== "invoice" && (<span className="text-sm text-text-secondary">
            {activeTab === "account"
                ? `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`
                : `${teamStats?.total ?? 0} ${(teamStats?.total ?? 0) === 1 ? "member" : "members"}`}
          </span>)}
      </div>

      {renderTabContent()}
    </div>);
};
export default TeamSettings;
