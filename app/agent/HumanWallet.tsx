"use client";
import FinanceButton from "@/presentation/components/Common/FinanceButton";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import OwnershipTransfer from "./OwnershipTransfer";
import type { VaultPayment } from "@/services/server/vault-payment-journal";

interface Wallet { id: string; address: string; blockchain: string }
interface Authentication { userToken: string; encryptionKey: string; appId: string }
export default function HumanWallet({ administrator }: { administrator?: string }) {
  const queries = useQueryClient();
  const payments = useQuery({ queryKey: ["agent-payments"], queryFn: () => workspaceFetch<{ payments: VaultPayment[] }>("/api/agent-payments"), retry: false });
  const config = useQuery({ queryKey: ["human-wallet-config"], queryFn: () => workspaceFetch<{ configured: boolean; executionWallet?: string | null }>("/api/treasury/human-wallet"), retry: false });
  const [authentication, setAuthentication] = useState<Authentication | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const reviewBar = useRef<HTMLDivElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!challengeId) return;
    reviewBar.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    reviewButton.current?.focus({ preventScroll: true });
  }, [challengeId]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [challengePurpose, setChallengePurpose] = useState("wallet setup");
  const request = <T,>(action: string, extra = {}) => workspaceFetch<T>("/api/treasury/human-wallet", "POST", { action, ...extra });
  const refresh = async () => { const result = await request<{ wallets: Wallet[] }>("wallets"); setWallets(result.wallets); };
  const perform = async (action: "connect" | "initialize" | "refresh" | "disconnect") => {
    setPending(true); setMessage("");
    try {
      if (action === "connect") { setAuthentication(await request<Authentication>("connect")); await refresh(); }
      if (action === "initialize") { const result = await request<{ challengeId: string }>("initialize"); setChallengePurpose("wallet setup"); setChallengeId(result.challengeId); setMessage("Wallet setup is ready. Continue to set your private PIN and recovery answers in Circle’s secure screen."); }
      if (action === "refresh") await refresh();
      if (action === "disconnect") { await request("disconnect"); setAuthentication(null); setWallets([]); setChallengeId(null); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Wallet request failed"); }
    finally { setPending(false); }
  };
  const verifyExecutor = async () => {
    setPending(true); setMessage("");
    try { await request("verify_executor"); await queries.invalidateQueries({ queryKey: ["treasury-vault"] }); setMessage("Circle execution wallet assignment is verified on Arc. Vault remains paused; payment execution still requires its workflow connection."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Execution wallet verification failed"); }
    finally { setPending(false); }
  };
  const prepareAdministration = async (action: string, recordId?: string) => {
    setPending(true); setMessage("");
    try {
      const result = await request<{ challengeId: string }>(action, { address: targetAddress, recordId, requestId: crypto.randomUUID() });
      setChallengePurpose(action.replaceAll("_", " ")); setChallengeId(result.challengeId);
      setMessage("Review the contract action in Circle’s secure screen before signing. No action is confirmed until its on-chain state is verified.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Administration request failed"); }
    finally { setPending(false); }
  };
  const authorize = async () => {
    if (!authentication || !challengeId) return;
    setPending(true); setMessage("");
    try {
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
      const sdk = new W3SSdk({ appSettings: { appId: authentication.appId } });
      sdk.setAuthentication({ userToken: authentication.userToken, encryptionKey: authentication.encryptionKey });
      sdk.execute(challengeId, (error) => {
        setPending(false);
        if (error) { setMessage("Circle authorization was not completed. You can retry the setup."); return; }
        setChallengeId(null); setMessage("Circle confirmed the challenge. Refresh wallet details to check the resulting address.");
        void refresh().catch(() => setMessage("Circle confirmed the challenge; wallet indexing is still pending. Refresh wallet details."));
      });
    } catch { setPending(false); setMessage("Could not open Circle’s approval screen. Check the Circle App ID and allowed origins."); }
  };
  const button = "rounded-lg border border-primary-divider px-4 py-2 text-sm disabled:opacity-50";
  return <div className="relative max-h-[80dvh] overflow-y-auto overscroll-contain rounded-2xl border border-primary-divider bg-background p-5 space-y-3">
    <h2 className="text-lg font-semibold">Human approval wallet</h2>
    <p className="text-sm text-text-secondary">Keep wallet approvals inside Settlbox with Circle. Your private PIN and recovery answers are entered in Circle’s secure screen, never sent to the finance agent.</p>
    {config.isLoading && <p role="status">Checking wallet configuration…</p>}
    {config.error && <p role="alert" className="text-sm text-red-600">{config.error.message}</p>}
    {config.data && !config.data.configured && <p className="text-sm text-text-secondary">Embedded approvals need the Circle application configuration. Contact the workspace administrator to finish setup.</p>}
    <div className="flex flex-wrap gap-3">
      {!authentication && <FinanceButton className={button} disabled={!config.data?.configured || pending} onClick={() => void perform("connect")}>Connect approval wallet</FinanceButton>}
      {authentication && <>
        <FinanceButton className={button} disabled={pending || Boolean(challengeId)} onClick={() => void perform("connect")}>Reconnect approval wallet</FinanceButton>
        {wallets.length === 0 && !challengeId && <FinanceButton className={button} disabled={pending} onClick={() => void perform("initialize")}>Set up approval wallet</FinanceButton>}
        <FinanceButton className={button} disabled={pending} onClick={() => void perform("refresh")}>Refresh wallet details</FinanceButton>
        <FinanceButton className={button} disabled={pending} onClick={() => void perform("disconnect")}>Disconnect</FinanceButton>
      </>}
    </div>
    {wallets.map(wallet => <div key={wallet.id} className="text-sm space-y-2">
      <p className="break-all">Arc Testnet · {wallet.address}</p>
      {administrator && administrator.toLowerCase() !== wallet.address.toLowerCase() && <OwnershipTransfer address={wallet.address} onChallenge={id => { setChallengePurpose("accept ownership"); setChallengeId(id); }} />}
      <p className="text-text-secondary">{administrator && administrator.toLowerCase() === wallet.address.toLowerCase() ? "This wallet matches the configured vault administrator. Every administration action requires your authorization." : "This wallet is not the current vault administrator. Creating it does not transfer vault ownership. The current administrator must nominate it and the new wallet must accept ownership."}</p>
    </div>)}
    {wallets.some(wallet => administrator?.toLowerCase() === wallet.address.toLowerCase()) && <div className="space-y-3">
      <label className="flex flex-col gap-2 text-sm">Approver or recipient address<input value={targetAddress} onChange={event => setTargetAddress(event.target.value)} disabled={pending || Boolean(challengeId)} className="rounded-lg border border-primary-divider p-2 bg-background" /></label>
      <div className="flex flex-wrap gap-3">{[["allow_approver", "Add human approver"], ["allow_recipient", "Allow recipient"], ["pause", "Pause vault"], ["unpause", "Activate vault"]].map(([action, label]) => <FinanceButton key={action} className={button} disabled={pending || Boolean(challengeId)} onClick={() => void prepareAdministration(action)}>{label}</FinanceButton>)}</div>
      <div className="space-y-2 border-t border-primary-divider pt-3">
        <p className="font-medium">Circle execution wallet</p>
        <p className="text-sm break-all">{config.data?.executionWallet || "Execution wallet configuration unavailable"}</p>
        <p className="text-sm text-text-secondary">Assign the dedicated Circle wallet for automated contract calls. Your approval wallet keeps administration and human approvals. Keep the vault paused during setup.</p>
        <div className="flex flex-wrap gap-3">
          <FinanceButton className={button} disabled={pending || Boolean(challengeId) || !config.data?.executionWallet} onClick={() => void prepareAdministration("configure_executor")}>Assign Circle executor</FinanceButton>
          <FinanceButton className={button} disabled={pending || Boolean(challengeId)} onClick={() => void verifyExecutor()}>Verify Circle executor</FinanceButton>
        </div>
      </div>
      {payments.data?.payments.filter(payment => payment.status === "awaiting_approval").map(payment => <div key={payment.id} className="rounded-lg border border-primary-divider p-3 space-y-2">
        <p>Approve {payment.amount} USDC to <span className="break-all">{payment.recipient}</span></p>
        <p className="text-xs text-text-secondary break-all">Obligation: {payment.recordId} · Vault payment: {payment.id}</p>
        <FinanceButton className={button} disabled={pending || Boolean(challengeId)} onClick={() => void prepareAdministration("approve_payment", payment.recordId)}>Prepare payment approval</FinanceButton>
      </div>)}
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {pending && <p role="status" className="text-sm">Waiting for Circle…</p>}
    {challengeId && <div ref={reviewBar} role="region" aria-label="Pending Circle authorization" className="sticky bottom-0 z-20 rounded-xl border border-primary-divider bg-background p-4 shadow-lg space-y-2">
      <p className="text-sm font-medium">Approval ready: {challengePurpose}</p>
      <p className="text-sm text-text-secondary">Open Circle’s secure screen to review this action and enter your private PIN.</p>
      <FinanceButton ref={reviewButton} className="w-full rounded-lg bg-[#1b1b1b] px-4 py-3 text-sm font-medium text-white whitespace-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50" disabled={pending} onClick={() => void authorize()}>{pending ? "Waiting for Circle…" : `Review and authorize ${challengePurpose}`}</FinanceButton>
    </div>}
  </div>;
}
