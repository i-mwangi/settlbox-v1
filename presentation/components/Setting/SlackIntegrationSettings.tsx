"use client";
import React, { useState } from "react";
import SettingHeader from "./SettingHeader";
import { PrimaryButton } from "../Common/PrimaryButton";
import { SecondaryButton } from "../Common/SecondaryButton";
import toast from "react-hot-toast";
type ConnectionStep = "disconnected" | "connecting" | "connected";
const INITIALLY_VISIBLE = 2;
const notificationTypes = [
    {
        title: "Pending transaction created",
        description: "Get notified when a team member creates multisig approval. Includes amount, recipient, and who initiated it.",
        preview: {
            message: "New pending transaction requires approval",
            time: "11:42 AM",
            fields: [
                { label: "Amount", value: "5,000 USDC" },
                { label: "To", value: "Acme Corp (0x1a2b...3c4d)" },
                { label: "Initiated by", value: "Martin Chen" },
                { label: "Signatures", value: "0/2 required" },
            ],
            borderColor: "#36C5F0",
            actions: ["Approve", "View in Settlbox"],
        },
    },
    {
        title: "Transaction signed",
        description: "Know instantly when a signer approves a pending transaction. Track how many signatures remain before execution.",
        preview: {
            message: "Transaction signed by a team member",
            time: "11:45 AM",
            fields: [
                { label: "Transaction", value: "Payment to Acme Corp" },
                { label: "Signed by", value: "Sarah Wong" },
                { label: "Signatures", value: "1/2 required" },
                { label: "Status", value: "Awaiting 1 more signature" },
            ],
            borderColor: "#2EB67D",
            actions: ["Sign Now", "View in Settlbox"],
        },
    },
    {
        title: "Transaction rejected",
        description: "Get alerted when a signer rejects a transaction. Includes the reason so the team can discuss and re-submit.",
        preview: {
            message: "Transaction rejected",
            time: "2:18 PM",
            fields: [
                { label: "Transaction", value: "Payment to Vendor XYZ" },
                { label: "Rejected by", value: "David Lee" },
                { label: "Reason", value: "Amount exceeds approved budget for Q2" },
                { label: "Amount", value: "12,500 USDC" },
            ],
            borderColor: "#E01E5A",
            actions: ["View Details"],
        },
    },
    {
        title: "Invoice received",
        description: "When a client or vendor sends an invoice, the bot posts it with amount, due date, and a link to review.",
        preview: {
            message: "New invoice received",
            time: "9:30 AM",
            fields: [
                { label: "From", value: "CloudHost Inc." },
                { label: "Amount", value: "3,200 USDC" },
                { label: "Due date", value: "October 15, 2026" },
                { label: "Invoice #", value: "INV-2026-0412" },
            ],
            borderColor: "#ECB22E",
            actions: ["Review Invoice", "View in Settlbox"],
        },
    },
    {
        title: "Payment collected via payment link",
        description: "Real-time notification when someone pays through your payment link. Shows amount, payer info, and link name.",
        preview: {
            message: "Payment received via payment link",
            time: "3:05 PM",
            fields: [
                { label: "Payment link", value: "Q2 Retainer - Design Services" },
                { label: "Payer", value: "john@startup.io" },
                { label: "Amount", value: "1,500 USDC" },
                { label: "Network", value: "Arc Testnet" },
            ],
            borderColor: "#2EB67D",
            actions: ["View Transaction"],
        },
    },
    {
        title: "Corporate card spend",
        description: "Every time a corporate card transaction occurs, the bot posts the merchant, amount, cardholder, and remaining limit.",
        preview: {
            message: "Corporate card transaction detected",
            time: "12:22 PM",
            fields: [
                { label: "Cardholder", value: "Martin Chen" },
                { label: "Merchant", value: "AWS (Amazon Web Services)" },
                { label: "Amount", value: "480 USDC" },
                { label: "Remaining limit", value: "4,520 / 5,000 USDC" },
            ],
            borderColor: "#ECB22E",
            actions: ["View Card Activity"],
        },
    },
];
export default function SlackIntegrationSettings() {
    const [connectionStep, setConnectionStep] = useState<ConnectionStep>("disconnected");
    const [selectedChannel, setSelectedChannel] = useState("#settlbox-notifications");
    const [expanded, setExpanded] = useState(false);
    const handleConnect = () => {
        setConnectionStep("connecting");
        setTimeout(() => {
            setConnectionStep("connected");
            toast.success("Slack workspace connected successfully");
        }, 1500);
    };
    const handleDisconnect = () => {
        setConnectionStep("disconnected");
        toast.success("Slack workspace disconnected");
    };
    return (<div className="flex flex-col">
      <SettingHeader icon="/misc/integration-icon.svg" title="Integrations"/>

      
      <div className="border border-primary-divider rounded-2xl p-5 flex flex-col gap-5 min-w-[600px]">
        
        <div className="flex items-center gap-3">
          <img src="/misc/slack-icon.svg" alt="Slack" className="w-8 h-8"/>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold text-text-primary tracking-[-0.36px] leading-none">
              Slack Integration
            </h2>
            <p className="text-sm text-text-secondary tracking-[-0.21px]">
              Get real-time notifications for treasury activity in your Slack channel
            </p>
          </div>
          {connectionStep === "connected" && (<div className="ml-auto flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-green-500"/>
              <span className="text-xs font-medium text-green-700">Connected</span>
            </div>)}
        </div>

        
        <div className="border-t border-primary-divider"/>

        
        {connectionStep === "disconnected" && (<div className="flex flex-col gap-4">
            <p className="text-sm text-text-primary tracking-[-0.21px] leading-5">
              Connect your Slack workspace to receive instant notifications about transactions, invoices, and payments
              directly in your team channels.
            </p>
            <div className="flex justify-start">
              <PrimaryButton text="Add to Slack" icon="/misc/slack-icon.svg" iconPosition="left" onClick={handleConnect} containerClassName="w-auto" buttonClassName="w-fit whitespace-nowrap"/>
            </div>
          </div>)}

        {connectionStep === "connecting" && (<div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm text-text-secondary tracking-[-0.21px]">Connecting to Slack...</p>
          </div>)}

        {connectionStep === "connected" && (<div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-text-primary tracking-[-0.21px]">Workspace</p>
                <p className="text-sm text-text-secondary tracking-[-0.21px]">Quantum3 Labs</p>
              </div>
              <SecondaryButton text="Disconnect" onClick={handleDisconnect} variant="red" buttonClassName="w-fit whitespace-nowrap"/>
            </div>

            
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text-primary tracking-[-0.21px]">Notification channel</p>
              <select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="text-sm font-medium text-text-primary leading-5 tracking-[-0.56px] outline-none w-full bg-app-background px-3 py-2.5 border border-primary-divider rounded-lg cursor-pointer">
                <option value="#settlbox-notifications">#settlbox-notifications</option>
                <option value="#treasury">#treasury</option>
                <option value="#finance">#finance</option>
                <option value="#general">#general</option>
              </select>
            </div>
          </div>)}

        
        <div className="border-t border-primary-divider"/>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-text-primary tracking-[-0.32px] leading-none">How it works</h3>
          <p className="text-sm text-text-secondary tracking-[-0.21px] leading-5">
            Once connected, the Settlbox Slack bot will automatically send notifications to your selected channel for the
            following events:
          </p>

          <div className="flex flex-col gap-3">
            {(expanded ? notificationTypes : notificationTypes.slice(0, INITIALLY_VISIBLE)).map((notification, index) => (<div key={index} className="flex flex-col gap-3 p-4 rounded-xl bg-app-background border border-primary-divider">
                  
                  <div className="flex gap-3 items-center">
                    <div className="w-7 h-7 rounded-lg bg-background border border-primary-divider flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-text-primary">{index + 1}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-text-primary tracking-[-0.21px] leading-5">
                        {notification.title}
                      </p>
                      <p className="text-xs text-text-secondary tracking-[-0.21px] leading-4">
                        {notification.description}
                      </p>
                    </div>
                  </div>

                  
                  <div className="bg-[#1a1d21] rounded-lg p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                        <img src="/misc/slack-icon.svg" alt="Settlbox Bot" className="w-3.5 h-3.5"/>
                      </div>
                      <span className="text-xs font-bold text-white">Settlbox Bot</span>
                      <span className="text-[10px] text-gray-400">{notification.preview.time}</span>
                    </div>
                    <div className="ml-7 flex flex-col gap-1">
                      <p className="text-xs text-white">{notification.preview.message}</p>
                      <div className="border-l-[3px] bg-white/5 rounded-r px-2.5 py-1.5 flex flex-col gap-0.5" style={{ borderLeftColor: notification.preview.borderColor }}>
                        {notification.preview.fields.map((field, fi) => (<p key={fi} className="text-[11px] text-gray-300">
                            <span className="font-semibold text-white">{field.label}:</span> {field.value}
                          </p>))}
                      </div>
                      <div className="flex gap-1.5 mt-0.5">
                        {notification.preview.actions.map((action, ai) => (<div key={ai} className={`text-white text-[10px] font-medium px-2.5 py-0.5 rounded ${ai === 0 ? "bg-[#2EB67D]" : "bg-white/10"}`}>
                            {action}
                          </div>))}
                      </div>
                    </div>
                  </div>
                </div>))}
          </div>

          
          {notificationTypes.length > INITIALLY_VISIBLE && (<button onClick={() => setExpanded(!expanded)} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-primary-divider hover:bg-app-background/50 transition-colors cursor-pointer">
              <span className="text-sm font-medium text-text-primary tracking-[-0.21px]">
                {expanded ? "Show less" : `Show ${notificationTypes.length - INITIALLY_VISIBLE} more notifications`}
              </span>
              <svg className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>)}
        </div>
      </div>
    </div>);
}
