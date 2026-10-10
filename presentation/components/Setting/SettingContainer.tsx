"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTitle } from "@/presentation/contexts/TitleProvider";
import { NavArrowRight } from "iconoir-react";
import AccountSettings from "./AccountSettings";
import CompanySettings from "./CompanySettings";
import NotificationSettings from "./NotificationSettings";
import SlackIntegrationSettings from "./SlackIntegrationSettings";
import GoogleSheetsIntegrationSettings from "./GoogleSheetsIntegrationSettings";
import StripeIntegrationSettings from "./StripeIntegrationSettings";
import TeamSettings from "./TeamSettings";
import TeamAccountContainer from "./TeamSetting/TeamAccountContainer";
import InvoiceSettingsTab from "./TeamSetting/InvoiceSettingsTab";
type TabType = "account" | "notifications" | "company" | "team" | "integrations" | "google-sheets" | "stripe" | "invoice";
interface SettingTab {
    id: TabType;
    icon: string;
    label: string;
}
const generalSettingTabs: SettingTab[] = [
    { id: "account", icon: "/misc/user-hexagon-icon.svg", label: "Account" },
    { id: "company", icon: "/misc/company-icon.svg", label: "Company" },
    { id: "invoice", icon: "/sidebar/invoice.svg", label: "Invoice" },
];
const teamSettingTabs: SettingTab[] = [{ id: "team", icon: "/misc/team-icon.svg", label: "My team" }];
const integrationSettingTabs: SettingTab[] = [
    { id: "integrations", icon: "/misc/integration-icon.svg", label: "Slack" },
    { id: "google-sheets", icon: "/misc/integration-icon.svg", label: "Google Sheets" },
    { id: "stripe", icon: "/misc/integration-icon.svg", label: "Stripe" },
];
const tabLabels: Record<TabType, string> = {
    account: "Account",
    notifications: "Notifications",
    company: "Company",
    invoice: "Invoice",
    team: "My team",
    integrations: "Slack",
    "google-sheets": "Google Sheets",
    stripe: "Stripe",
};
export default function SettingContainer() {
    const { setTitle, setShowBackArrow } = useTitle();
    const [activeTab, setActiveTab] = useState<TabType>("account");
    const searchParams = useSearchParams();
    const teamAccountParam = searchParams.get("team-account");
    useEffect(() => {
        if (teamAccountParam) {
            setActiveTab("team");
        }
    }, [teamAccountParam]);
    useEffect(() => {
        setTitle(<div className="flex items-center gap-1.5 text-[14px]">
        <button type="button" onClick={() => setActiveTab("account")} className="text-text-secondary transition-colors cursor-pointer hover:text-text-primary">
          Settings
        </button>
        <NavArrowRight width={12} height={12} strokeWidth={2.2} className="text-text-secondary/50"/>
        <span className="font-medium text-text-primary">{tabLabels[activeTab]}</span>
      </div>);
        setShowBackArrow(false);
    }, [activeTab]);
    return (<div className="flex w-full h-full flex-col bg-background">
      
      <div className="flex w-full items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Settings</h1>
          <p className="text-[14px] text-text-secondary">
            Manage your account, company, team and integration preferences.
          </p>
        </div>
      </div>

      
      <div className="flex w-full flex-1 min-h-0 flex-row gap-2 px-6 pb-6">
        
        <div className="bg-background flex flex-col items-start w-full max-w-[300px] h-full">
          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex flex-col gap-1 items-start pb-5 pt-3 w-full">
              
              <div className="flex items-center px-4 py-0 w-full">
                <p className="font-medium text-sm text-text-secondary tracking-[-0.56px] leading-5">General</p>
              </div>

              
              {generalSettingTabs.map(tab => (<div key={tab.id} className={`flex gap-4 items-center px-5 py-3 rounded-lg w-full cursor-pointer transition-colors ${activeTab === tab.id ? "bg-app-background" : "hover:bg-app-background/50"}`} onClick={() => setActiveTab(tab.id)}>
                  <div className="flex gap-2 items-center">
                    <img src={tab.icon} alt={tab.label} className="w-5"/>
                    <p className="font-medium text-sm text-text-primary tracking-[-0.56px] leading-5">{tab.label}</p>
                  </div>
                </div>))}

              
              <div className="flex items-center px-4 py-0 w-full">
                <p className="font-medium text-sm text-text-secondary tracking-[-0.56px] leading-5">Team</p>
              </div>

              
              {teamSettingTabs.map(tab => (<div key={tab.id} className={`flex gap-4 items-center px-5 py-3 rounded-lg w-full cursor-pointer transition-colors ${activeTab === tab.id ? "bg-app-background" : "hover:bg-app-background/50"}`} onClick={() => setActiveTab(tab.id)}>
                  <div className="flex gap-2 items-center">
                    <img src={tab.icon} alt={tab.label} className="w-5"/>
                    <p className="font-medium text-sm text-text-primary tracking-[-0.56px] leading-5">{tab.label}</p>
                  </div>
                </div>))}

              
              <div className="flex items-center px-4 py-0 w-full">
                <p className="font-medium text-sm text-text-secondary tracking-[-0.56px] leading-5">Integrations</p>
              </div>

              
              {integrationSettingTabs.map(tab => (<div key={tab.id} className={`flex gap-4 items-center px-5 py-3 rounded-lg w-full cursor-pointer transition-colors ${activeTab === tab.id ? "bg-app-background" : "hover:bg-app-background/50"}`} onClick={() => setActiveTab(tab.id)}>
                  <div className="flex gap-2 items-center">
                    <img src={tab.icon} alt={tab.label} className="w-5"/>
                    <p className="font-medium text-sm text-text-primary tracking-[-0.56px] leading-5">{tab.label}</p>
                  </div>
                </div>))}
            </div>
          </div>
        </div>

        
        <div className="flex-1 bg-background flex justify-center items-start overflow-y-auto">
          <div className="w-[900px]">
            
            {activeTab === "account" && <AccountSettings />}
            
            {activeTab === "company" && <CompanySettings />}
            {activeTab === "team" && (teamAccountParam ? <TeamAccountContainer /> : <TeamSettings />)}
            {activeTab === "integrations" && <SlackIntegrationSettings />}
            {activeTab === "google-sheets" && <GoogleSheetsIntegrationSettings />}
            {activeTab === "stripe" && <StripeIntegrationSettings />}
            {activeTab === "invoice" && <InvoiceSettingsTab />}
          </div>
        </div>
      </div>
    </div>);
}
