"use client";
import ReviewHeading from "./ReviewHeading";
import FinanceButton from "@/presentation/components/Common/FinanceButton";
import { useEffect, useRef, useState } from "react";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import type { AgentProposal } from "@/types/agent-operation";

const names: Record<string,string> = { allow_recipient:"Allow payment recipient", allow_approver:"Add human approver", pause:"Pause treasury payments", unpause:"Activate treasury payments", configure_executor:"Assign Circle execution wallet" };
export default function WalletReview({ proposal, onClose, onUpdated }: { proposal: AgentProposal; onClose: () => void; onUpdated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const mounted = useRef(true); const [busy,setBusy] = useState(false); const [status,setStatus] = useState(""); const [error,setError] = useState("");
  useEffect(() => { mounted.current = true; dialog.current?.showModal(); return () => { mounted.current = false; }; }, []);
  const verify = async () => { const result = await workspaceFetch<AgentProposal>("/api/agent-actions","POST",{action:"verify",id:proposal.id}); setStatus(result.status === "completed" ? "Verified on Arc and recorded." : "Waiting for Arc confirmation. Check again shortly."); onUpdated(); };
  const authorize = async () => {
    setBusy(true);setError("");
    try {
      const prepared = await workspaceFetch<{challengeId:string;authentication:{appId:string;userToken:string;encryptionKey:string}}>("/api/agent-actions","POST",{action:"confirm",id:proposal.id});
      const {W3SSdk} = await import("@circle-fin/w3s-pw-web-sdk"); const sdk = new W3SSdk({appSettings:{appId:prepared.authentication.appId}}); sdk.setAuthentication({userToken:prepared.authentication.userToken,encryptionKey:prepared.authentication.encryptionKey});
      dialog.current?.close();
      sdk.execute(prepared.challengeId, failure => { if (!mounted.current) return; dialog.current?.showModal();setBusy(false);if(failure)setError("Authorization was not completed. Check status before retrying.");else void verify().catch(()=>setStatus("Signature completed. Check Arc status shortly.")); });
    } catch(failure) { dialog.current?.showModal();setBusy(false);setError(failure instanceof Error?failure.message:"Could not open secure authorization"); }
  };
  return <dialog ref={dialog} aria-labelledby="wallet-review-title" onCancel={event=>{if(busy)event.preventDefault();else onClose();}} className="m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto rounded-2xl border border-primary-divider bg-background p-6 text-text-primary shadow-[0_34px_70px_-26px_rgba(20,32,64,0.32)] ring-[10px] ring-[#f1f2f4] backdrop:bg-app-background/60 backdrop:backdrop-blur-sm"><ReviewHeading id="wallet-review-title" title={names[String(proposal.operation.arguments.action)]} onClose={onClose} disabled={busy}/><p className="mt-3 text-[14px]">Arc Testnet. This changes treasury permissions or operation. Review before entering your PIN in Circle's secure screen.</p>{typeof proposal.operation.arguments.address==="string"&&<p className="my-4 break-all text-[14px]">Wallet: {proposal.operation.arguments.address}</p>}{error&&<p role="alert" className="mt-3 text-[14px] text-red-600">{error}</p>}{status&&<p role="status" className="mt-3 text-[14px]">{status}</p>}<div className="mt-6 flex flex-wrap gap-3"><FinanceButton disabled={busy||status==="Verified on Arc and recorded."} onClick={()=>void authorize()} className="rounded-xl bg-[#1b1b1b] px-5 py-3 text-[14px] text-white disabled:opacity-50">{busy?"Waiting for your authorization...":"Authorize with Circle"}</FinanceButton><FinanceButton disabled={busy} onClick={()=>void verify().catch(failure=>setError(failure.message))} className="rounded-xl border border-primary-divider px-4 py-3 text-[14px]">Check status</FinanceButton></div></dialog>;
}
