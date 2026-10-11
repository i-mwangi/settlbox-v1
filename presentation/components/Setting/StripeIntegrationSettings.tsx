"use client";
import React, { useState } from "react";
import SettingHeader from "./SettingHeader";
import { PrimaryButton } from "../Common/PrimaryButton";
import { SecondaryButton } from "../Common/SecondaryButton";
import { Badge, BadgeStatus } from "../Common/Badge";
import { ToggleSwitch } from "../Common/ToggleSwitch";
import toast from "react-hot-toast";
type ConnectionStep = "disconnected" | "connecting" | "connected";
const INITIALLY_VISIBLE = 2;
function StripeIcon({ size = 32 }: {
    size?: number;
}) {
    return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#635BFF"/>
      <path d="M15.2 12.6c0-0.9 0.7-1.3 1.9-1.3 1.7 0 3.8 0.5 5.5 1.4V8.4c-1.8-0.7-3.7-1-5.5-1-4.5 0-7.5 2.3-7.5 6.2 0 6.1 8.4 5.1 8.4 7.7 0 1.1-0.9 1.4-2.2 1.4-1.9 0-4.3-0.8-6.2-1.8v4.4c2.1 0.9 4.2 1.3 6.2 1.3 4.6 0 7.7-2.3 7.7-6.2 0-6.6-8.3-5.4-8.3-7.8z" fill="white"/>
    </svg>);
}
const featureItems = [
    {
        title: "Import invoices",
        description: "All your Stripe invoices are pulled into Settlbox with line items, customer details, and payment status. New invoices sync automatically.",
        preview: {
            type: "fields" as const,
            fields: [
                { label: "Invoice", value: "#INV-2026-0415" },
                { label: "Client", value: "Startup Inc." },
                { label: "Amount", value: "$3,200.00" },
                { label: "Status", value: "Paid" },
                { label: "Date", value: "Oct 6, 2026" },
            ],
        },
    },
    {
        title: "Payment history",
        description: "Your complete Stripe charge history appears in the Settlbox transaction feed alongside your on-chain transactions. One unified timeline.",
        preview: {
            type: "transactions" as const,
            transactions: [
                { source: "Stripe", label: "Startup Inc.", amount: "+$3,200", time: "2:30 PM" },
                { source: "On-chain", label: "0x1a2b...3c4d", amount: "+5,000 USDC", time: "1:15 PM" },
                { source: "Stripe", label: "Acme Corp", amount: "+$1,800", time: "11:00 AM" },
            ],
        },
    },
    {
        title: "Customer sync",
        description: "Stripe customers are imported into your Settlbox contact book with email, payment history, and lifetime value.",
        preview: {
            type: "fields" as const,
            fields: [
                { label: "Customer", value: "john@startup.io" },
                { label: "Payments", value: "12" },
                { label: "LTV", value: "$18,400" },
            ],
        },
    },
    {
        title: "Fiat + crypto unified view",
        description: "See your Stripe revenue alongside on-chain treasury in one dashboard. No more switching between tabs.",
        preview: {
            type: "sideBySide" as const,
            sideBySide: [
                { label: "Stripe", value: "$48,250" },
                { label: "On-chain", value: "52,000 USDC" },
            ],
        },
    },
];
export default function StripeIntegrationSettings() {
    const [connectionStep, setConnectionStep] = useState<ConnectionStep>("disconnected");
    const [dataRange, setDataRange] = useState("Last 30 days");
    const [toggles, setToggles] = useState({
        autoImport: true,
        syncCustomers: true,
        importHistory: false,
    });
    const [expanded, setExpanded] = useState(false);
    const handleConnect = () => {
        toast.error("Stripe connection requires a configured provider");
    };
    const handleDisconnect = () => {
        setConnectionStep("disconnected");
        toast.success("Stripe account disconnected");
    };
    return (<div className="flex flex-col">
      <SettingHeader icon="/misc/integration-icon.svg" title="Integrations"/>

      <div className="border border-primary-divider rounded-2xl p-5 flex flex-col gap-5 min-w-[600px]">
        
        <div className="flex items-center gap-3">
          <StripeIcon />
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold text-text-primary tracking-[-0.36px] leading-none">
              Stripe Integration
            </h2>
            <p className="text-sm text-text-secondary tracking-[-0.21px]">
              Import your Stripe payment history and invoices into Settlbox
            </p>
          </div>
          {connectionStep === "connected" && (<div className="ml-auto">
              <Badge status={BadgeStatus.SUCCESS} text="Connected"/>
            </div>)}
        </div>

        <div className="border-t border-primary-divider"/>

        
        {connectionStep === "disconnected" && (<div className="flex flex-col gap-4">
            <p className="text-sm text-text-primary tracking-[-0.21px] leading-5">
              Connect your Stripe account to pull in your complete payment history, invoices, and customer data. Run
              Stripe alongside Settlbox for a unified view of fiat and crypto finances.
            </p>
            <div className="flex justify-start">
              <PrimaryButton text="Connect with Stripe" onClick={handleConnect} containerClassName="w-auto" buttonClassName="w-fit whitespace-nowrap"/>
            </div>
          </div>)}

        {connectionStep === "connecting" && (<div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm text-text-secondary tracking-[-0.21px]">Connecting to Stripe...</p>
          </div>)}

        {connectionStep === "connected" && (<div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-text-primary tracking-[-0.21px]">Acme Corp</p>
                <p className="text-sm text-text-secondary tracking-[-0.21px]">acct_1234567890</p>
              </div>
              <SecondaryButton text="Disconnect" onClick={handleDisconnect} variant="red" buttonClassName="w-fit whitespace-nowrap"/>
            </div>

            
            <div className="flex gap-3">
              {[
                { label: "Invoices imported", value: "142" },
                { label: "Customers synced", value: "38" },
                { label: "Total volume", value: "$48,250" },
            ].map((stat) => (<div key={stat.label} className="flex-1 bg-app-background rounded-xl border border-primary-divider p-4 flex flex-col gap-1">
                  <span className="text-xs text-text-secondary tracking-[-0.21px]">{stat.label}</span>
                  <span className="text-sm font-semibold text-text-primary">{stat.value}</span>
                </div>))}
            </div>

            
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text-primary tracking-[-0.21px]">Data range</p>
              <select value={dataRange} onChange={(e) => setDataRange(e.target.value)} className="text-sm font-medium text-text-primary leading-5 tracking-[-0.56px] outline-none w-full bg-app-background px-3 py-2.5 border border-primary-divider rounded-lg cursor-pointer">
                <option value="Last 30 days">Last 30 days</option>
                <option value="Last 90 days">Last 90 days</option>
                <option value="Last 12 months">Last 12 months</option>
                <option value="All time">All time</option>
              </select>
            </div>

            
            <div className="flex flex-col gap-3">
              {[
                { key: "autoImport" as const, label: "Auto-import new invoices" },
                { key: "syncCustomers" as const, label: "Sync customer data" },
                { key: "importHistory" as const, label: "Import payment history" },
            ].map((toggle) => (<div key={toggle.key} className="flex items-center justify-between">
                  <p className="text-sm text-text-primary tracking-[-0.21px]">{toggle.label}</p>
                  <ToggleSwitch enabled={toggles[toggle.key]} onChange={(val) => setToggles((prev) => ({ ...prev, [toggle.key]: val }))}/>
                </div>))}
            </div>

            
            <div className="flex items-center gap-2">
              <Badge status={BadgeStatus.SUCCESS} text="Synced"/>
              <p className="text-xs text-text-secondary tracking-[-0.21px]">5 minutes ago</p>
            </div>
          </div>)}

        
        <div className="border-t border-primary-divider"/>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-text-primary tracking-[-0.32px] leading-none">How it works</h3>
          <p className="text-sm text-text-secondary tracking-[-0.21px] leading-5">
            Once connected, Settlbox pulls your Stripe data and keeps everything in sync. Here is what gets imported:
          </p>

          <div className="flex flex-col gap-3">
            {(expanded ? featureItems : featureItems.slice(0, INITIALLY_VISIBLE)).map((item, index) => (<div key={index} className="flex flex-col gap-3 p-4 rounded-xl bg-app-background border border-primary-divider">
                <div className="flex gap-3 items-center">
                  <div className="w-7 h-7 rounded-lg bg-background border border-primary-divider flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-text-primary">{index + 1}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-text-primary tracking-[-0.21px] leading-5">
                      {item.title}
                    </p>
                    <p className="text-xs text-text-secondary tracking-[-0.21px] leading-4">{item.description}</p>
                  </div>
                </div>

                
                <div className="bg-background rounded-lg p-3 border border-primary-divider">
                  {item.preview.type === "fields" && (<div className="flex flex-col gap-1">
                      {item.preview.fields!.map((field, fi) => (<div key={fi} className="flex justify-between py-1 border-b border-primary-divider last:border-0">
                          <span className="text-[11px] text-text-secondary">{field.label}</span>
                          <span className="text-[11px] font-medium text-text-primary">{field.value}</span>
                        </div>))}
                    </div>)}
                  {item.preview.type === "transactions" && (<div className="flex flex-col gap-1.5">
                      {item.preview.transactions!.map((tx, ti) => (<div key={ti} className="flex items-center justify-between py-1 border-b border-primary-divider last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge status={tx.source === "Stripe" ? BadgeStatus.PRIVATE : BadgeStatus.SUCCESS} text={tx.source} className="px-1.5"/>
                            <span className="text-[11px] text-text-secondary">{tx.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-text-primary">{tx.amount}</span>
                            <span className="text-[10px] text-text-secondary">{tx.time}</span>
                          </div>
                        </div>))}
                    </div>)}
                  {item.preview.type === "sideBySide" && (<div className="flex gap-3">
                      {item.preview.sideBySide!.map((side) => (<div key={side.label} className="flex-1 bg-app-background rounded-lg px-3 py-2.5 flex flex-col gap-1">
                          <span className="text-[10px] text-text-secondary">{side.label}</span>
                          <span className="text-sm font-semibold text-text-primary">{side.value}</span>
                        </div>))}
                    </div>)}
                </div>
              </div>))}
          </div>

          {featureItems.length > INITIALLY_VISIBLE && (<button onClick={() => setExpanded(!expanded)} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-primary-divider hover:bg-app-background/50 transition-colors cursor-pointer">
              <span className="text-sm font-medium text-text-primary tracking-[-0.21px]">
                {expanded ? "Show less" : `Show ${featureItems.length - INITIALLY_VISIBLE} more features`}
              </span>
              <svg className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>)}
        </div>
      </div>
    </div>);
}
