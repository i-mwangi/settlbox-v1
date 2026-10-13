"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { McpConnection } from "@/services/server/mcp-connections";

export default function McpSettings() {
  const connections = useQuery({ queryKey: ["mcp-connections"], queryFn: () => workspaceFetch<McpConnection[]>("/api/mcp-connections"), retry: false, gcTime: 0 });
  const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [tokenEnv, setTokenEnv] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const perform = async (body: unknown) => { setBusy(true); setError(""); try { await workspaceFetch("/api/mcp-connections", "POST", body); await connections.refetch(); return true; } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update connection"); return false; } finally { setBusy(false); } };
  const input = "w-full rounded-xl border border-primary-divider bg-background px-3 py-2 text-[14px]";
  const button = "rounded-xl border border-primary-divider px-4 py-2 text-[14px] disabled:opacity-50";
  return <section className="p-5 space-y-5 max-w-3xl"><header><h2 className="text-[20px] font-semibold">MCP connections</h2><p className="mt-2 text-[14px] text-text-secondary">Connect external tools to your finance chat. Choose which tools are available; every call opens a review before it runs.</p></header>
    {(error || connections.error) && <p role="alert" className="text-[14px] text-red-600">{error || connections.error?.message}</p>}
    <form className="rounded-2xl border border-primary-divider p-4 space-y-3" onSubmit={async event => { event.preventDefault(); if (await perform({ action: "save", connection: { name, url, tokenEnv, enabledTools: [] } })) { setName(""); setUrl(""); setTokenEnv(""); } }}>
      <label className="block text-[14px]">Connection name<input required maxLength={80} className={input} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="block text-[14px]">MCP endpoint<input required type="url" placeholder="https://tools.example.com/mcp" className={input} value={url} onChange={event => setUrl(event.target.value)} /></label>
      <label className="block text-[14px]">Token environment name (optional)<input placeholder="SETTLBOX_MCP_ACCOUNTING_TOKEN" className={input} value={tokenEnv} onChange={event => setTokenEnv(event.target.value)} /></label>
      <p className="text-[12px] text-text-secondary">Public HTTPS Streamable HTTP servers are supported. Store bearer tokens in the server environment, never in chat. OAuth-only and local command servers are not supported.</p>
      <button disabled={busy || !!connections.error} className={button}>Add connection</button>
    </form>
    {connections.data?.map(connection => <article key={connection.id} className="rounded-2xl border border-primary-divider p-4 space-y-3"><h3 className="font-medium">{connection.name}</h3><p className="break-all text-[14px] text-text-secondary">{connection.url}</p><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => void perform({ action: "discover", id: connection.id })}>Discover tools</button><button disabled={busy} className={button} onClick={() => { if (window.confirm(`Disconnect ${connection.name}? Pending tool requests will be blocked.`)) void perform({ action: "delete", id: connection.id }); }}>Disconnect</button></div>
      {!connection.tools.length && <p className="text-[14px] text-text-secondary">Discover this server's tools to choose what the finance agent can use.</p>}
      {connection.tools.map(tool => <label key={tool.name} className="flex items-start gap-3 rounded-xl border border-primary-divider p-3"><input type="checkbox" disabled={busy} checked={connection.enabledTools.includes(tool.name)} onChange={event => void perform({ action: "save", connection: { ...connection, enabledTools: event.target.checked ? [...connection.enabledTools, tool.name] : connection.enabledTools.filter(name => name !== tool.name) } })} /><span className="min-w-0"><span className="block text-[14px] font-medium break-all">{tool.name}</span><span className="block text-[12px] text-text-secondary break-words">{tool.description || "External tool"}</span></span></label>)}
    </article>)}
  </section>;
}
