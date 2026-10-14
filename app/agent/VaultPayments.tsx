"use client";
import FinanceButton from "@/presentation/components/Common/FinanceButton";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { VaultPayment } from "@/services/server/vault-payment-journal";
export function QueueVaultPayment({ runId, recordId }: { runId: string; recordId: string }) {
  const client = useQueryClient(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  return <div><FinanceButton disabled={pending} className="rounded-lg border border-primary-divider px-3 py-2 text-sm disabled:opacity-50" onClick={async () => {
    setPending(true); setError("");
    try { await workspaceFetch("/api/agent-payments", "POST", { action: "queue", runId, recordId }); await client.invalidateQueries({ queryKey: ["agent-payments"] }); }
    catch(error) { setError(error instanceof Error ? error.message : "Queue request failed"); } finally { setPending(false); }
  }}>{pending ? "Queueing…" : "Queue for vault approval"}</FinanceButton>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}</div>;
}
export default function VaultPayments() {
  const client = useQueryClient(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["agent-payments"], queryFn: () => workspaceFetch<{ payments: VaultPayment[]; events: { payment_id: string; event: string; created_at: string }[] }>("/api/agent-payments"), retry: false });
  const perform = async (action: string, recordId: string) => {
    setPending(true); setError("");
    try { await workspaceFetch("/api/agent-payments", "POST", { action, recordId }); await client.invalidateQueries({ queryKey: ["agent-payments"] }); await client.invalidateQueries({ queryKey: ["treasury-vault"] }); }
    catch(error) { setError(error instanceof Error ? error.message : "Payment request failed"); } finally { setPending(false); }
  };
  return <div className="rounded-2xl border border-primary-divider p-5 space-y-3">
    <h2 className="text-lg font-semibold">Vault payments and audit trail</h2>
    <p className="text-sm text-text-secondary">Queue an eligible saved obligation from its plan. Check its chain status, approve in Human approval wallet, then execute. Status checks never send funds.</p>
    {(error || query.error) && <p role="alert" className="text-red-600 text-sm">{error || query.error?.message}</p>}
    {query.data?.payments.length === 0 && <p className="text-sm">No vault payment requests yet.</p>}
    {query.data?.payments.map(payment => <div key={payment.id} className="rounded-lg border border-primary-divider p-3 space-y-2">
      <p>{payment.amount} USDC · {payment.status.replaceAll("_", " ")}</p>
      <p className="break-all text-sm">Recipient: {payment.recipient}</p>
      <p className="text-xs text-text-secondary break-all">Obligation: {payment.recordId} · Payment: {payment.id}</p>
      <div className="flex gap-3"><FinanceButton disabled={pending} onClick={() => void perform("reconcile", payment.recordId)} className="rounded-lg border border-primary-divider px-3 py-2 text-sm">Check chain status</FinanceButton>
        {payment.status === "queue_pending" && !payment.queueProviderId && <QueueVaultPayment runId={payment.runId} recordId={payment.recordId} />}
        {payment.status === "ready" && !payment.executeProviderId && <FinanceButton disabled={pending} onClick={() => void perform("execute", payment.recordId)} className="rounded-lg border border-primary-divider px-3 py-2 text-sm">Execute approved payment</FinanceButton>}
        {payment.transactionHash && <a href={`https://testnet.arcscan.app/tx/${payment.transactionHash}`} target="_blank" rel="noreferrer" className="text-sm text-primary-blue">View settlement</a>}
      </div>
    </div>)}
    <details><summary className="cursor-pointer text-sm">Saved audit events</summary><ul className="space-y-2 mt-3">{query.data?.events?.map((event, index) => <li key={index} className="text-xs break-all">{event.created_at} · {event.event} · {event.payment_id}</li>)}</ul></details>
  </div>;
}
