"use client";
import React, { useState } from "react";
import SettingHeader from "./SettingHeader";
import { PrimaryButton } from "../Common/PrimaryButton";
import { SecondaryButton } from "../Common/SecondaryButton";
import { Badge, BadgeStatus } from "../Common/Badge";
import toast from "react-hot-toast";
type ConnectionStep = "disconnected" | "connecting" | "connected";
const INITIALLY_VISIBLE = 2;
function GoogleSheetsIcon({ size = 32 }: {
    size?: number;
}) {
    return (<svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="2" width="24" height="28" rx="3" fill="#34A853"/>
      <rect x="7" y="8" width="18" height="18" rx="1" fill="white"/>
      <line x1="7" y1="13" x2="25" y2="13" stroke="#34A853" strokeWidth="0.8"/>
      <line x1="7" y1="18" x2="25" y2="18" stroke="#34A853" strokeWidth="0.8"/>
      <line x1="7" y1="23" x2="25" y2="23" stroke="#34A853" strokeWidth="0.8"/>
      <line x1="14" y1="8" x2="14" y2="26" stroke="#34A853" strokeWidth="0.8"/>
      <line x1="20" y1="8" x2="20" y2="26" stroke="#34A853" strokeWidth="0.8"/>
    </svg>);
}
function MiniSpreadsheet({ headers, rows, }: {
    headers: string[];
    rows: string[][];
}) {
    return (<div className="rounded-lg overflow-hidden border border-primary-divider">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="bg-app-background">
            {headers.map((h) => (<th key={h} className="px-2.5 py-1.5 text-left font-semibold text-text-primary">
                {h}
              </th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (<tr key={ri} className="border-t border-primary-divider">
              {row.map((cell, ci) => (<td key={ci} className="px-2.5 py-1.5 text-text-secondary">
                  {cell}
                </td>))}
            </tr>))}
        </tbody>
      </table>
    </div>);
}
const featureItems = [
    {
        title: "Auto-import invoices",
        description: "Settlbox reads your invoice sheet and creates draft invoices automatically. Columns like amount, recipient, due date, and currency are auto-mapped.",
        preview: {
            headers: ["Invoice #", "Client", "Amount", "Due Date", "Status"],
            rows: [
                ["INV-0041", "Acme Corp", "5,000 USDC", "Oct 15, 2026", "Draft"],
                ["INV-0042", "TechCo", "2,800 USDC", "Oct 20, 2026", "Pending"],
            ],
        },
    },
    {
        title: "Sync payroll records",
        description: "Import your team payment spreadsheet. Settlbox maps wallet addresses, amounts, and pay periods to your payroll dashboard.",
        preview: {
            headers: ["Name", "Wallet Address", "Amount (USDC)", "Period"],
            rows: [
                ["Martin Chen", "0x1a2b...3c4d", "8,500", "Oct 2026"],
                ["Sarah Wong", "0x5e6f...7a8b", "7,200", "Oct 2026"],
            ],
        },
    },
    {
        title: "Transaction tracking",
        description: "Every on-chain or off-chain payment recorded in Settlbox is written back to your sheet with tx hash, status, and timestamp.",
        preview: {
            headers: ["Tx Hash", "Status", "Timestamp"],
            rows: [
                ["0x9c8d...ef01", "Confirmed", "Oct 6, 2026 14:32"],
                ["0xa1b2...c3d4", "Pending", "Oct 6, 2026 14:45"],
            ],
        },
    },
    {
        title: "Two-way sync",
        description: "Changes in your Google Sheet (new rows, updated amounts) are reflected in Settlbox. Changes in Settlbox (payment status, tx hash) are written back to your sheet.",
        preview: {
            headers: ["Source", "Direction", "Data"],
            rows: [
                ["Google Sheets", "->  Settlbox", "New rows, amounts"],
                ["Settlbox", "->  Sheets", "Tx hash, status"],
            ],
        },
    },
];
export default function GoogleSheetsIntegrationSettings() {
    const [connectionStep, setConnectionStep] = useState<ConnectionStep>("disconnected");
    const [selectedSheet, setSelectedSheet] = useState("Q4 2026 Payroll");
    const [syncFrequency, setSyncFrequency] = useState("Every 15 minutes");
    const [expanded, setExpanded] = useState(false);
    const handleConnect = () => {
        toast.error("Google Sheets connection requires a configured provider");
    };
    const handleDisconnect = () => {
        setConnectionStep("disconnected");
        toast.success("Google Sheets disconnected");
    };
    return (<div className="flex flex-col">
      <SettingHeader icon="/misc/integration-icon.svg" title="Integrations"/>

      <div className="border border-primary-divider rounded-2xl p-5 flex flex-col gap-5 min-w-[600px]">
        
        <div className="flex items-center gap-3">
          <GoogleSheetsIcon />
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-semibold text-text-primary tracking-[-0.36px] leading-none">
              Google Sheets Integration
            </h2>
            <p className="text-sm text-text-secondary tracking-[-0.21px]">
              Import and sync your financial data from Google Sheets
            </p>
          </div>
          {connectionStep === "connected" && (<div className="ml-auto">
              <Badge status={BadgeStatus.SUCCESS} text="Connected"/>
            </div>)}
        </div>

        <div className="border-t border-primary-divider"/>

        
        {connectionStep === "disconnected" && (<div className="flex flex-col gap-4">
            <p className="text-sm text-text-primary tracking-[-0.21px] leading-5">
              Connect your Google Sheets to automatically import invoices, payroll records, and transaction data. Settlbox
              syncs bidirectionally, so your sheets stay up to date.
            </p>
            <div className="flex justify-start">
              <PrimaryButton text="Connect Google Sheets" onClick={handleConnect} containerClassName="w-auto" buttonClassName="w-fit whitespace-nowrap"/>
            </div>
          </div>)}

        {connectionStep === "connecting" && (<div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm text-text-secondary tracking-[-0.21px]">Connecting to Google Sheets...</p>
          </div>)}

        {connectionStep === "connected" && (<div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-text-primary tracking-[-0.21px]">Connected account</p>
                <p className="text-sm text-text-secondary tracking-[-0.21px]">finance@yourcompany.com</p>
              </div>
              <SecondaryButton text="Disconnect" onClick={handleDisconnect} variant="red" buttonClassName="w-fit whitespace-nowrap"/>
            </div>

            
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text-primary tracking-[-0.21px]">Select spreadsheet</p>
              <select value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)} className="text-sm font-medium text-text-primary leading-5 tracking-[-0.56px] outline-none w-full bg-app-background px-3 py-2.5 border border-primary-divider rounded-lg cursor-pointer">
                <option value="Q4 2026 Payroll">Q4 2026 Payroll</option>
                <option value="Invoice Tracker">Invoice Tracker</option>
                <option value="Treasury Log">Treasury Log</option>
                <option value="Contractor Payments">Contractor Payments</option>
              </select>
            </div>

            
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text-primary tracking-[-0.21px]">Sync frequency</p>
              <select value={syncFrequency} onChange={(e) => setSyncFrequency(e.target.value)} className="text-sm font-medium text-text-primary leading-5 tracking-[-0.56px] outline-none w-full bg-app-background px-3 py-2.5 border border-primary-divider rounded-lg cursor-pointer">
                <option value="Every 5 minutes">Every 5 minutes</option>
                <option value="Every 15 minutes">Every 15 minutes</option>
                <option value="Every hour">Every hour</option>
                <option value="Manual only">Manual only</option>
              </select>
            </div>

            
            <div className="flex items-center gap-2">
              <Badge status={BadgeStatus.SUCCESS} text="Synced"/>
              <p className="text-xs text-text-secondary tracking-[-0.21px]">2 minutes ago</p>
            </div>
          </div>)}

        
        <div className="border-t border-primary-divider"/>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-text-primary tracking-[-0.32px] leading-none">How it works</h3>
          <p className="text-sm text-text-secondary tracking-[-0.21px] leading-5">
            Once connected, Settlbox reads and writes to your Google Sheets automatically. Here is what you can do:
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

                
                <div className="bg-background rounded-lg p-3">
                  <MiniSpreadsheet headers={item.preview.headers} rows={item.preview.rows}/>
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
