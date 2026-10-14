"use client";
import FinanceButton from "@/presentation/components/Common/FinanceButton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { InboundCredential, McpScope } from "@/services/server/inbound-mcp";
export default function InboundMcpSettings() {
  const state = useQuery({ queryKey: ["inbound-mcp-access"], queryFn: () => workspaceFetch<{credentials:InboundCredential[];events:{id:string;event:string;at:number}[]}>("/api/mcp-access"), retry:false, gcTime:0 });
  const [name,setName] = useState(""); const [propose,setPropose] = useState(false); const [read,setRead] = useState(true);
  const [token,setToken] = useState(""); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const act = async (body:unknown) => { setBusy(true);setError("");setToken("");try { const result=await workspaceFetch<{token?:string}>("/api/mcp-access","POST",body);setToken(result.token||"");await state.refetch(); } catch(e){setError(e instanceof Error?e.message:"Request failed");}finally{setBusy(false);} };
  const button="rounded-xl border border-primary-divider px-4 py-2 text-[14px] disabled:opacity-50";
  return <section className="border-t border-primary-divider pt-5 space-y-4 text-[14px]">
    <h2 className="text-[20px] font-semibold">Connect an external assistant to Settlbox</h2>
    <p className="text-text-secondary">MCP endpoint: <code>/api/mcp</code>. Create a separate bearer credential for each client. Changes appear in Finance agent for your review; external clients cannot authorize payments.</p>
    <form className="space-y-3" onSubmit={event=>{event.preventDefault();const scopes:McpScope[]=[...(read?["records:read" as const]:[]),...(propose?["actions:propose" as const]:[])];void act({action:"create",name,scopes});}}>
      <label className="block">Assistant name<input required maxLength={80} value={name} onChange={event=>setName(event.target.value)} className="mt-2 w-full rounded-xl border border-primary-divider bg-background p-3" placeholder="My MCP client" /></label>
      <label className="flex gap-2"><input type="checkbox" checked={read} onChange={event=>setRead(event.target.checked)} />Read company invoices and payables</label>
      <label className="flex gap-2"><input type="checkbox" checked={propose} onChange={event=>setPropose(event.target.checked)} />Propose actions for owner review</label>
      <FinanceButton variant="primary" className={button} disabled={busy||!!state.error||(!read&&!propose)}>Create 30-day credential</FinanceButton>
    </form>
    {token&&<div className="rounded-xl border border-primary-divider p-4 space-y-3"><p>Shown once. Save this credential privately in your MCP client. Do not paste it into chat.</p><textarea aria-label="New MCP bearer credential" readOnly autoComplete="off" value={token} className="w-full break-all rounded-lg border border-primary-divider p-3 text-[14px]" /><FinanceButton className={button} onClick={()=>setToken("")}>Hide credential</FinanceButton></div>}
    {(error||state.error)&&<p role="alert">{error||state.error?.message}</p>}
    {state.data?.credentials.map(row=><div key={row.id} className="rounded-xl border border-primary-divider p-3 flex flex-wrap items-center justify-between gap-3"><div><p>{row.name}</p><p className="text-[12px] text-text-secondary">{row.scopes.join(" · ")} · {row.revoked?"Revoked":`Expires ${new Date(row.expiresAt).toLocaleDateString()}`}</p></div>{!row.revoked&&<FinanceButton className={button} disabled={busy} onClick={()=>void act({action:"revoke",id:row.id})}>Revoke</FinanceButton>}</div>)}
    {!!state.data?.events.length&&<details><summary className="cursor-pointer">External access audit</summary>{state.data.events.map((event,index)=><p key={index} className="mt-2 text-[12px]">{new Date(event.at).toLocaleString()} · {event.event} · {event.id}</p>)}</details>}
  </section>;
}
