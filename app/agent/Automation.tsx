"use client";
import FinanceButton from "@/presentation/components/Common/FinanceButton";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { FinanceAutomation } from "@/services/server/finance-worker-store";
export default function Automation() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["finance-automation"], queryFn: () => workspaceFetch<{ config: FinanceAutomation; runnerConfigured: boolean; events: { cycle_id: string; event: string; created_at: string }[] }>("/api/agent-worker"), retry: false, refetchInterval: 30000 });
  const [queue, setQueue] = useState(false); const [reserve, setReserve] = useState("0"); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  const request = async (action: string, enabled?: boolean) => {
    setPending(true); setMessage("");
    try {
      const result = await workspaceFetch<{ status?: string }>("/api/agent-worker", "POST", { action, ...(action === "configure" ? { settings: enabled ? { enabled: true, autoQueue: queue, reserveUsdc: reserve, maxActions: 3 } : { enabled: false, autoQueue: query.data?.config.autoQueue || false, reserveUsdc: query.data?.config.reserveUsdc || "0", maxActions: query.data?.config.maxActions || 3 } } : {}) });
      await client.invalidateQueries({ queryKey: ["finance-automation"] }); await client.invalidateQueries({ queryKey: ["agent-payments"] }); await client.invalidateQueries({ queryKey: ["agent-runs"] });
      setMessage(action === "tick" ? result.status === "complete" ? "Cycle finished. Review its saved events below." : result.status === "disabled_or_busy" ? "Automation is stopped or another cycle is running." : "The cycle needs review. Check its saved events below." : enabled ? "Automation enabled within the vault policy. Human approvals remain required by the contract." : "Automation stopped. Transactions already submitted can still confirm.");
    } catch(error) { setMessage(error instanceof Error ? error.message : "Automation request failed"); } finally { setPending(false); }
  };
  const enabled = query.data?.config.enabled;
  const button = "rounded-lg border border-primary-divider px-3 py-2 text-sm disabled:opacity-50";
  return <div className="rounded-2xl border border-primary-divider bg-background p-5 space-y-3">
    <h2 className="text-lg font-semibold">Finance automation</h2>
    <p className="text-sm">{query.isLoading ? "Checking automation…" : enabled ? "Enabled" : "Stopped"} · Contract approvals, recipient permissions and spending limits remain authoritative.</p>
    <p className="text-sm text-text-secondary">The worker checks saved payments and executes only those ready on-chain. Optional queueing prepares due obligations from fresh policy-checked plans. It cannot sign human approvals or change vault settings.</p>
    {!enabled && <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={queue} onChange={event => setQueue(event.target.checked)} />Also queue eligible due obligations automatically</label>
      <label className="flex flex-col gap-2 text-sm">Additional liquidity reserve (USDC)<input value={reserve} onChange={event => setReserve(event.target.value)} className="rounded-lg border border-primary-divider p-2 bg-background" /></label>
    </div>}
    {enabled && <p className="text-sm text-text-secondary">Automatic queueing: {query.data?.config.autoQueue ? "enabled" : "disabled"} · Additional reserve: {query.data?.config.reserveUsdc} USDC · At most {query.data?.config.maxActions} submission attempts per cycle.</p>}
    {query.data && !query.data.runnerConfigured && <p className="text-sm text-text-secondary">Background runner needs server configuration. Run one cycle remains available after enabling.</p>}
    <div className="flex flex-wrap gap-3">
      <FinanceButton className={button} disabled={pending || !query.data} onClick={() => void request("configure", !enabled)}>{enabled ? "Stop automation" : "Enable automation"}</FinanceButton>
      <FinanceButton className={button} disabled={pending || !enabled} onClick={() => void request("tick")}>Run one cycle</FinanceButton>
    </div>
    {(message || query.error) && <p role="status" className="text-sm">{message || query.error?.message}</p>}
    <details><summary className="cursor-pointer text-sm">Automation audit events</summary><ul className="space-y-2 mt-3">{query.data?.events.map((event,index) => <li key={index} className="text-xs break-all">{event.created_at} · {event.event}</li>)}</ul></details>
  </div>;
}
