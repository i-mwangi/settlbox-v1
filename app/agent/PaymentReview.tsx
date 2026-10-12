"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { AgentAction } from "@/types/agent";
import type { VaultPayment } from "@/services/server/vault-payment-journal";
import type { BusinessRecord } from "@/types/business";

export default function PaymentReview({ action, runId, onClose }: { action: AgentAction; runId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<{ id: string; authentication: { appId: string; userToken: string; encryptionKey: string } } | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const records = useQuery({ queryKey: ["chat-obligation", action.recordId], queryFn: () => workspaceFetch<BusinessRecord[]>("/api/business-records"), retry: false, staleTime: 0 });
  const record = records.data?.find(item => item.id === action.recordId);
  const payment = useQuery({ queryKey: ["chat-payment", action.recordId], queryFn: async () => {
    const result = await workspaceFetch<{ payments: VaultPayment[] }>("/api/agent-payments");
    const saved = result.payments.find(item => item.recordId === action.recordId);
    if (saved && !["paid", "cancelled", "expired", "policy_changed"].includes(saved.status)) return workspaceFetch<VaultPayment>("/api/agent-payments", "POST", { action: "reconcile", recordId: action.recordId });
    return saved ?? null;
  }, retry: false, refetchInterval: 8000 });
  const perform = async (operation: "queue" | "execute" | "approve") => {
    setBusy(true); setError("");
    try {
      if (operation === "approve") {
        const authentication = await workspaceFetch<{ appId: string; userToken: string; encryptionKey: string }>("/api/treasury/human-wallet", "POST", { action: "connect" });
        const result = await workspaceFetch<{ challengeId: string }>("/api/treasury/human-wallet", "POST", { action: "approve_payment", recordId: action.recordId, requestId: crypto.randomUUID() });
        setChallenge({ id: result.challengeId, authentication });
      } else { await workspaceFetch("/api/agent-payments", "POST", { action: operation, runId, recordId: action.recordId }); await payment.refetch(); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not complete this step"); }
    finally { setBusy(false); }
  };
  const authorize = async () => {
    if (!challenge) return;
    setBusy(true); setError("");
    try {
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
      const sdk = new W3SSdk({ appSettings: { appId: challenge.authentication.appId } });
      sdk.setAuthentication({ userToken: challenge.authentication.userToken, encryptionKey: challenge.authentication.encryptionKey });
      // Circle renders its secure screen outside this dialog. Release the native top layer first.
      dialog.current?.close();
      sdk.execute(challenge.id, failure => { dialog.current?.showModal(); setBusy(false); if (failure) setError("Authorization was not completed. You can retry."); else { setChallenge(null); void payment.refetch(); } });
    } catch { dialog.current?.showModal(); setBusy(false); setError("Circle’s secure screen could not open. Please retry."); }
  };
  const saved = payment.data;
  const button = "rounded-xl bg-[#1b1b1b] text-white px-4 py-3 text-sm disabled:opacity-50";
  return <dialog ref={dialog} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} aria-labelledby="payment-review-title" className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-primary-divider bg-background p-6 text-text-primary shadow-xl backdrop:bg-black/40">
    <div className="flex items-center justify-between gap-4"><h2 id="payment-review-title" className="text-xl font-semibold">Review payment</h2><button aria-label="Close payment review" disabled={busy} onClick={onClose} className="p-2">✕</button></div>
    <p className="mt-2 text-sm text-text-secondary">{action.title}</p><p className="mt-5 text-3xl font-semibold">{saved?.amount ?? action.amountUsdc} <span className="text-base">USDC</span></p><p className="mt-2 text-sm">Arc Testnet</p>
    {(saved || record) && <div className="mt-4"><p className="text-sm text-text-secondary">Recipient</p><p className="break-all text-sm">{saved?.recipient ?? record?.recipient}</p></div>}
    <p role="status" className="mt-4 text-sm">{saved ? saved.status === "paid" ? "Payment settled and recorded." : saved.status === "awaiting_approval" ? "Your approval is needed." : saved.status === "ready" ? "Approved. Ready to send." : saved.status.replaceAll("_", " ") : action.disposition === "blocked" ? "This payment needs attention before it can proceed." : "Prepare the saved payment for review. Its amount and recipient are checked again before submission."}</p>
    {(error || payment.error) && <p role="alert" className="mt-4 text-sm text-red-600">{error || payment.error?.message}</p>}
    {records.error && <p role="alert" className="mt-4 text-sm text-red-600">Payment details could not be loaded.</p>}
    {action.disposition === "blocked" && !saved && <p role="alert" className="mt-4 text-sm">{action.reasons.join(". ")}. This payment cannot be sent.</p>}
    {!saved && record && (record.amount !== action.amountUsdc || record.status !== "draft") && <p role="alert" className="mt-4 text-sm">This obligation changed. Send a new chat message to refresh your plan.</p>}
    <div className="mt-6 flex flex-col gap-3">
      {!saved && action.disposition === "review" && !payment.isLoading && !payment.error && <button className={button} disabled={busy || !record || record.amount !== action.amountUsdc || record.status !== "draft"} onClick={() => void perform("queue")}>{busy ? "Preparing…" : "Prepare approval"}</button>}
      {saved?.status === "queue_pending" && !saved.queueProviderId && <button className={button} disabled={busy} onClick={() => void perform("queue")}>Retry preparation</button>}
      {saved?.status === "awaiting_approval" && !challenge && <button className={button} disabled={busy} onClick={() => void perform("approve")}>{busy ? "Preparing secure approval…" : "Continue to authorization"}</button>}
      {challenge && <><p className="text-sm text-text-secondary">Review in Circle’s secure screen. Enter your PIN there.</p><button className={button} disabled={busy} onClick={() => void authorize()}>{busy ? "Waiting for you…" : "Authorize with Circle"}</button></>}
      {saved?.status === "ready" && !saved.executeProviderId && <button className={button} disabled={busy} onClick={() => void perform("execute")}>{busy ? "Submitting…" : `Send ${saved.amount} USDC`}</button>}
      {saved?.transactionHash && <a className="text-sm text-primary-blue" target="_blank" rel="noreferrer" href={`https://testnet.arcscan.app/tx/${saved.transactionHash}`}>View settlement</a>}
      <button className="rounded-xl border border-primary-divider px-4 py-3 text-sm disabled:opacity-50" disabled={busy || payment.isFetching} onClick={() => void payment.refetch()}>Refresh status</button>
    </div>
  </dialog>;
}
