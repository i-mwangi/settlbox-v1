"use client";
import ReviewHeading from "./ReviewHeading";
import FinanceButton from "@/presentation/components/Common/FinanceButton";
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
  const mounted = useRef(true);
  const requestId = useRef(crypto.randomUUID());
  const continued = useRef(false);
  const submitting = useRef(false);
  const signed = useRef(false);
  const [continuing, setContinuing] = useState(false);
  useEffect(() => { mounted.current = true; dialog.current?.showModal(); return () => { mounted.current = false; continued.current = false; }; }, []);
  const records = useQuery({ queryKey: ["chat-obligation", action.recordId], queryFn: () => workspaceFetch<BusinessRecord[]>("/api/business-records"), retry: false, staleTime: 0 });
  const record = records.data?.find(item => item.id === action.recordId);
  const payment = useQuery({ queryKey: ["chat-payment", action.recordId], queryFn: async () => {
    const result = await workspaceFetch<{ payments: VaultPayment[] }>("/api/agent-payments");
    const saved = result.payments.find(item => item.recordId === action.recordId);
    if (saved && !["paid", "cancelled", "expired", "policy_changed"].includes(saved.status)) return workspaceFetch<VaultPayment>("/api/agent-payments", "POST", { action: "reconcile", recordId: action.recordId });
    return saved ?? null;
  }, retry: false, refetchInterval: 8000 });
  const stop = (message: string) => { continued.current = false; setContinuing(false); setBusy(false); setError(message); };
  const authorize = async () => {
    if (!mounted.current) return;
    setBusy(true); setError("");
    try {
      const authentication = await workspaceFetch<{ appId: string; userToken: string; encryptionKey: string }>("/api/treasury/human-wallet", "POST", { action: "connect" });
      const result = await workspaceFetch<{ challengeId: string }>("/api/treasury/human-wallet", "POST", { action: "approve_payment", recordId: action.recordId, requestId: requestId.current });
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
      if (!mounted.current) return;
      const sdk = new W3SSdk({ appSettings: { appId: authentication.appId } });
      sdk.setAuthentication({ userToken: authentication.userToken, encryptionKey: authentication.encryptionKey });
      dialog.current?.close();
      sdk.execute(result.challengeId, failure => {
        if (!mounted.current) return;
        dialog.current?.showModal(); setBusy(false);
        if (failure) stop("Authorization was not completed. Check status before retrying.");
        else { signed.current = true; void payment.refetch(); }
      });
    } catch (failure) { if (mounted.current) { dialog.current?.showModal(); stop(failure instanceof Error ? failure.message : "Circle's secure screen could not open."); } }
  };
  const proceed = async () => {
    continued.current = true; submitting.current = false; setContinuing(true); setError(""); setBusy(true);
    try {
      if (!payment.data || (payment.data.status === "queue_pending" && !payment.data.queueProviderId)) await workspaceFetch("/api/agent-payments", "POST", { action: "queue", runId, recordId: action.recordId });
      await payment.refetch();
    } catch (failure) { stop(failure instanceof Error ? failure.message : "Payment preparation failed"); }
    finally { if (mounted.current) setBusy(false); }
  };
  useEffect(() => {
    const saved = payment.data;
    if (!continued.current || busy || !saved || submitting.current) return;
    if (saved.status === "awaiting_approval" && !signed.current) { submitting.current = true; void authorize().finally(() => { submitting.current = false; }); }
    if (saved.status === "ready" && !saved.executeProviderId) {
      submitting.current = true; setBusy(true);
      void workspaceFetch("/api/agent-payments", "POST", { action: "execute", runId, recordId: action.recordId })
        .then(() => { continued.current = false; setContinuing(false); return payment.refetch(); })
        .catch(failure => stop(failure.message))
        .finally(() => { if (mounted.current) setBusy(false); });
    }
    if (["paid", "cancelled", "expired", "policy_changed", "execution_pending"].includes(saved.status)) { continued.current = false; setContinuing(false); }
  }, [payment.data, busy]);
  const saved = payment.data;
  const button = "rounded-xl bg-[#1b1b1b] text-white px-4 py-3 text-[14px] disabled:opacity-50";
  return <dialog ref={dialog} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} aria-labelledby="payment-review-title" className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-primary-divider bg-background p-6 text-text-primary shadow-[0_34px_70px_-26px_rgba(20,32,64,0.32)] ring-[10px] ring-[#f1f2f4] backdrop:bg-app-background/60 backdrop:backdrop-blur-sm">
    <ReviewHeading id="payment-review-title" title={"Review payment"} onClose={onClose} disabled={busy}/>
    <p className="mt-2 text-[14px] text-text-secondary">{action.title}</p><p className="mt-5 text-3xl font-semibold">{saved?.amount ?? action.amountUsdc} <span className="text-base">USDC</span></p><p className="mt-2 text-[14px]">Arc Testnet</p>
    {(saved || record) && <div className="mt-4"><p className="text-[14px] text-text-secondary">Recipient</p><p className="break-all text-[14px]">{saved?.recipient ?? record?.recipient}</p></div>}
    <p role="status" className="mt-4 text-[14px]">{saved ? saved.status === "paid" ? "Payment settled and recorded." : saved.status === "awaiting_approval" ? "Your approval is needed." : saved.status === "ready" ? "Approved. Ready to send." : saved.status.replaceAll("_", " ") : action.disposition === "blocked" ? "This payment needs attention before it can proceed." : "Prepare the saved payment for review. Its amount and recipient are checked again before submission."}</p>
    {(error || payment.error) && <p role="alert" className="mt-4 text-[14px] text-red-600">{error || payment.error?.message}</p>}
    {records.error && <p role="alert" className="mt-4 text-[14px] text-red-600">Payment details could not be loaded.</p>}
    {action.disposition === "blocked" && !saved && <p role="alert" className="mt-4 text-[14px]">{action.reasons.join(". ")}. This payment cannot be sent.</p>}
    {!saved && record && (record.amount !== action.amountUsdc || record.status !== "draft") && <p role="alert" className="mt-4 text-[14px]">This obligation changed. Send a new chat message to refresh your plan.</p>}
    <div className="mt-6 flex flex-col gap-3">
      {(action.disposition === "review" || saved) && (!saved || ["queue_pending", "awaiting_approval", "ready"].includes(saved.status)) && <><p className="text-[14px] text-text-secondary">Continue to authorize this exact payment. After any required Circle PIN approval is verified, Settlbox submits it automatically within the contract's rules.</p><FinanceButton className={button} disabled={busy || continuing || payment.isLoading || !!payment.error || (!saved && (!record || record.amount !== action.amountUsdc || record.status !== "draft"))} onClick={() => void proceed()}>{busy || continuing ? "Completing your payment..." : `Authorize ${saved?.amount ?? action.amountUsdc} USDC`}</FinanceButton></>}
      {saved?.transactionHash && <a className="text-[14px] text-primary-blue" target="_blank" rel="noreferrer" href={`https://testnet.arcscan.app/tx/${saved.transactionHash}`}>View settlement</a>}
      <FinanceButton className="rounded-xl border border-primary-divider px-4 py-3 text-[14px] disabled:opacity-50" disabled={busy || payment.isFetching} onClick={() => void payment.refetch()}>Refresh status</FinanceButton>
    </div>
  </dialog>;
}
