"use client";
import {useEffect,useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {workspaceFetch} from "@/presentation/services/api/seeded-workspace";
import IntegrationGuide from "./IntegrationGuide";
import IntegrationFrame from "./IntegrationFrame";
import FinanceButton from "../Common/FinanceButton";
import {Badge,BadgeStatus} from "../Common/Badge";
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

type Preview={id:string;rows:{sourceId:string;input:{kind:string;title:string;amount:string;recipient:string;dueDate:string;counterparty?:string;description?:string}}[]};
export default function GoogleSheetsIntegrationSettings(){
 const status=useQuery({queryKey:["google-sheets-connection"],queryFn:()=>workspaceFetch<{configured:boolean;connected:boolean;connectedAt?:string}>("/api/integrations/google-sheets"),retry:false});
 const [sheet,setSheet]=useState("");const [tab,setTab]=useState("Sheet1");const [preview,setPreview]=useState<Preview>();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");const [exportUrl,setExportUrl]=useState("");
 useEffect(()=>{const result=new URLSearchParams(window.location.search).get("google");if(result==="failed")setError("Google authorization was not completed. Reconnect and check your Google Cloud settings.");},[]);
 async function act(action:string){setBusy(true);setError("");setMessage("");setExportUrl("");try{const result=await workspaceFetch<any>("/api/integrations/google-sheets","POST",{action,spreadsheetId:sheet,tab,previewId:preview?.id});if(action==="connect"){window.location.assign(result.url);return;}if(action==="preview")setPreview(result);if(action==="import"){setMessage(`${result.imported} draft records saved. No payment was sent.`);setPreview(undefined);window.dispatchEvent(new Event("settlbox-workspace-refresh"));}if(action==="export"){setMessage(`${result.rows} saved records exported to a new spreadsheet.`);setExportUrl(result.url);}if(action==="disconnect"){setPreview(undefined);setMessage("Google Sheets disconnected.");}await status.refetch();}catch(e){setError(e instanceof Error?e.message:"Google Sheets request failed");}finally{setBusy(false);}}
 const input="w-full rounded-lg border border-primary-divider bg-app-background px-3 py-2.5 text-[14px]";
 return <IntegrationFrame><div className="flex items-center gap-3"><GoogleSheetsIcon/><div className="flex-1"><h2 className="text-[18px] font-semibold">Google Sheets Integration</h2><p className="text-[14px] text-text-secondary">Import reviewed drafts and export saved financial records</p></div>{status.data?.connected&&<Badge text="Connected" status={BadgeStatus.SUCCESS}/>}</div><div className="border-t border-primary-divider"/>
 {(error||status.error)&&<p role="alert" className="text-[14px] text-red-600">{error||status.error?.message}</p>}{message&&<p role="status" className="text-[14px]">{message}</p>}
 {!status.data?.connected?<><p className="text-[14px]">Connect your Google account. Google will ask for permission to read and edit spreadsheets. Settlbox imports only the spreadsheet and tab you select, and exports into a new spreadsheet.</p>{status.data&&!status.data.configured&&<p className="text-[14px] text-text-secondary">Google OAuth needs server configuration before you can connect. See the Google Sheets setup guide.</p>}<FinanceButton variant="primary" className="self-start" disabled={busy||!status.data?.configured} onClick={()=>void act("connect")}>Connect Google Sheets</FinanceButton></>:<><div className="flex justify-between items-center"><p className="text-[14px]">Connected {status.data.connectedAt?new Date(status.data.connectedAt).toLocaleDateString():""}</p><FinanceButton disabled={busy} onClick={()=>void act("disconnect")}>Disconnect</FinanceButton></div>
 <section className="rounded-2xl border border-primary-divider bg-app-background p-4 space-y-3"><h3 className="font-semibold text-[16px]">Import drafts</h3><p className="text-[14px] text-text-secondary">Use these column headers in row 1: sourceId, kind, title, counterparty, recipient, amount, dueDate, description. Up to 100 rows. Keep sourceId stable to prevent duplicate imports. Amounts are USDC; dates use YYYY-MM-DD.</p><label className="block text-[14px]">Spreadsheet ID<input className={input} value={sheet} onChange={e=>{setSheet(e.target.value);setPreview(undefined);}} placeholder="ID between /d/ and /edit in the Google Sheets URL"/></label><label className="block text-[14px]">Tab name<input className={input} value={tab} onChange={e=>{setTab(e.target.value);setPreview(undefined);}}/></label><FinanceButton disabled={busy||!sheet.trim()||!tab.trim()} onClick={()=>void act("preview")}>Preview import</FinanceButton>
 {preview&&<div className="space-y-3"><p className="text-[14px]">Review {preview.rows.length} drafts. Importing does not issue invoices, approve bills or send money.</p><div className="overflow-x-auto rounded-xl bg-white p-3"><table className="w-full min-w-[640px] text-[14px]"><thead className="bg-app-background"><tr>{["Title / description","Client / recipient","Type","Amount","Due date","Status"].map(label=><th key={label} className="p-3 text-left font-medium">{label}</th>)}</tr></thead><tbody>{preview.rows.map(row=><tr key={row.sourceId} className="border-t border-primary-divider"><td className="p-3">{row.input.title}<p className="text-[12px] text-text-secondary mt-1">{row.input.description||"—"}</p></td><td className="p-3">{row.input.counterparty||"—"}<p className="text-[12px] text-text-secondary break-all mt-1">{row.input.recipient}</p></td><td className="p-3 capitalize">{row.input.kind}</td><td className="p-3 whitespace-nowrap">{row.input.amount} USDC</td><td className="p-3 whitespace-nowrap">{row.input.dueDate}</td><td className="p-3"><Badge text="Draft" status={BadgeStatus.AWAITING}/></td></tr>)}</tbody></table></div><FinanceButton variant="primary" disabled={busy||!preview.rows.length} onClick={()=>void act("import")}>Import reviewed drafts</FinanceButton></div>}</section>
 <section className="rounded-2xl border border-primary-divider bg-app-background p-4 space-y-3"><h3 className="font-semibold text-[16px]">Export records</h3><p className="text-[14px] text-text-secondary">Create a new spreadsheet containing up to 1000 saved records, their statuses and transaction hashes. Existing spreadsheets are not overwritten.</p><FinanceButton variant="primary" disabled={busy} onClick={()=>void act("export")}>Export to new spreadsheet</FinanceButton>{exportUrl&&<a className="block text-[14px] text-primary-blue underline" target="_blank" rel="noreferrer" href={exportUrl}>Open exported spreadsheet</a>}</section></>}
 <IntegrationGuide provider="google"/>
 {busy&&<p role="status" className="text-[14px] text-text-secondary">Working with Google Sheets…</p>}
 </IntegrationFrame>;
}
