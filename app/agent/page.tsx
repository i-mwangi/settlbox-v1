"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspaceFetch } from "@/presentation/services/api/seeded-workspace";
import { useDemo } from "@/presentation/contexts/DemoProvider";
import type { AgentChatTurn } from "@/types/agent-chat";
import type { AgentAction } from "@/types/agent";
import ActionReview from "./ActionReview";
import WalletReview from "./WalletReview";
import type { AgentProposal } from "@/types/agent-operation";
import PaymentReview from "./PaymentReview";

const suggestions = ["What needs my attention?", "Help me pay an outstanding bill", "How much can we keep available?"];
export default function AgentPage() {
  const { activeEntityId } = useDemo();
  const enabled = activeEntityId === "entity-3";
  const client = useQueryClient();
  const [proposalReview, setProposalReview] = useState<AgentProposal | null>(null);
  const session = useQuery({ queryKey: ["agent-chat-session"], enabled, gcTime: 0, queryFn: () => workspaceFetch<{ principal: { id: string; role: string } }>("/api/operator/session"), retry: false });
  const canChat = enabled && !!session.data && ["OWNER", "ADMIN"].includes(session.data.principal.role);
  const history = useQuery({ queryKey: ["agent-chat", activeEntityId, session.data?.principal.id], enabled: canChat, gcTime: 0, queryFn: () => workspaceFetch<AgentChatTurn[]>("/api/agent-chat"), retry: false });
  const proposals = useQuery({ queryKey: ["agent-actions", activeEntityId, session.data?.principal.id], enabled: canChat && session.data?.principal.role === "OWNER", gcTime: 0, queryFn: () => workspaceFetch<AgentProposal[]>("/api/agent-actions"), retry: false });
  const openProposal = (proposal: AgentProposal, turn: AgentChatTurn) => {
    if (proposal.operation.tool === "payment.review") { const action = turn.run.actions.find(item => item.recordId === proposal.operation.arguments.recordId); if (action) setReview({ action, runId: turn.run.id }); }
    else setProposalReview(proposal);
  };
  const scopeRef = useRef(""); scopeRef.current = `${activeEntityId}:${session.data?.principal.id}`;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ message: string; requestId: string; throughDate: string; reserveUsdc: string } | null>(null);
  const [review, setReview] = useState<{ action: AgentAction; runId: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [history.data?.length, busy]);
  useEffect(() => { setPending(null); setMessage(""); setError(""); setReview(null); setProposalReview(null); }, [activeEntityId, session.data?.principal.id]);
  const send = async (text = message) => {
    if (!text.trim() || busy || !canChat) return;
    const date = new Date(); date.setDate(date.getDate() + 30);
    const throughDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const input = pending && pending.message === text.trim() ? pending : { message: text.trim(), requestId: crypto.randomUUID(), throughDate, reserveUsdc: "0" };
    const scope = scopeRef.current;
    setPending(input); setBusy(true); setError("");
    try { const turn = await workspaceFetch<AgentChatTurn>("/api/agent-chat", "POST", input); if (scope !== scopeRef.current) return; if (turn.proposal) openProposal(turn.proposal, turn); await proposals.refetch(); setMessage(""); setPending(null); await client.invalidateQueries({ queryKey: ["agent-chat", activeEntityId, session.data?.principal.id] }); await client.invalidateQueries({ queryKey: ["agent-runs"] }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Your message could not be sent"); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-5">
    <header><h1 className="text-2xl font-semibold text-text-primary">Finance agent</h1><p className="mt-1 text-sm text-text-secondary">Tell me what you need. We'll review it together.</p></header>
    {!enabled ? <p role="status" className="rounded-2xl border border-primary-divider p-5">Select the company treasury workspace to chat.</p> : <div className="rounded-2xl border border-primary-divider bg-background overflow-hidden">
      <div className="border-b border-primary-divider px-5 py-3 text-xs text-text-secondary">Arc Testnet  -  Payments need your authorization</div>
      <div role="log" aria-label="Finance conversation" aria-live="polite" className="max-h-[60dvh] min-h-[260px] overflow-y-auto overscroll-contain p-5 space-y-6">
        {!history.data?.length && <div className="py-8 space-y-4"><h2 className="text-xl font-semibold">How can I help with your business today?</h2><p className="text-sm text-text-secondary">Ask about upcoming bills, treasury balances or a payment you want to review.</p><div className="flex flex-wrap gap-2">{suggestions.map(text => <button key={text} disabled={busy || !canChat || history.isLoading} onClick={() => { setMessage(text); void send(text); }} className="rounded-xl border border-primary-divider px-4 py-3 text-sm text-left disabled:opacity-50">{text}</button>)}</div></div>}
        {history.data?.map((turn, index) => <article key={turn.id} className="space-y-4">
          <div className="ml-auto max-w-[85%] w-fit rounded-2xl bg-[#1b1b1b] px-4 py-3 text-sm text-white whitespace-pre-wrap break-words">{turn.message}</div>
          <div className="max-w-[95%] space-y-3"><p className="text-xs font-medium text-text-secondary">Settlbox</p><p className="text-sm leading-6 whitespace-pre-wrap break-words">{turn.answer}</p>
            {turn.proposal && (() => { const proposal = proposals.data?.find(item => item.id === turn.proposal!.id) || turn.proposal; return <div className="rounded-xl border border-primary-divider p-3 text-sm"><p>{proposal.status === "completed" ? "Action completed and recorded." : proposal.status === "cancelled" ? "Review dismissed." : proposal.status === "uncertain" || proposal.status === "running" ? "Result unresolved. Check current records before another request." : "Your review is required."}</p>{!["cancelled"].includes(proposal.status) && <button className="mt-2 underline" onClick={() => openProposal(proposal, turn)}>{proposal.status === "completed" ? "View result" : "Open review"}</button>}</div>; })()}
            {index === history.data.length - 1 && <div className="space-y-2">{turn.run.actions.filter(action => !turn.recordIds || turn.recordIds.includes(action.recordId)).map(action => <div key={action.recordId} className="rounded-xl border border-primary-divider p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">{action.title}</p><p className="text-sm">{action.amountUsdc} USDC</p></div><p className="text-xs text-text-secondary">Due {action.dueDate}  -  {action.disposition === "blocked" ? "Needs attention" : action.tool === "review_receivable" ? "Incoming invoice" : "Ready for review"}</p>{action.disposition === "blocked" && <p className="text-sm text-text-secondary">{action.reasons.join(". ")}</p>}</div>)}<p className="text-xs text-text-secondary">Snapshot from {new Date(turn.createdAt).toLocaleString()}. Payment details are checked again before sending.</p></div>}
          </div>
        </article>)}
        {busy && pending && <div className="ml-auto max-w-[85%] w-fit rounded-2xl bg-[#1b1b1b] px-4 py-3 text-sm text-white whitespace-pre-wrap break-words">{pending.message}</div>}
        {busy && <p role="status" className="text-sm text-text-secondary">Checking your treasury and saved obligations...</p>}
        <div ref={end} />
      </div>
      <form className="border-t border-primary-divider p-4 space-y-3" onSubmit={event => { event.preventDefault(); void send(); }}>
        {session.data && !canChat && <p role="status" className="text-sm">An owner or admin can use finance chat.</p>}
        {(error || history.error || session.error) && <p role="alert" className="text-sm text-red-600">{error || history.error?.message || session.error?.message}</p>}
        <div className="flex items-end gap-3"><textarea aria-label="Message the finance agent" placeholder="Ask about your business's money..." value={message} maxLength={2000} rows={2} disabled={busy || !canChat} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} onChange={event => { setMessage(event.target.value); setPending(null); }} className="min-w-0 flex-1 resize-y rounded-xl border border-primary-divider bg-background p-3 text-sm focus:outline-blue-600" /><button type="submit" disabled={busy || !canChat || !message.trim()} className="rounded-xl bg-[#1b1b1b] px-5 py-3 text-sm text-white disabled:opacity-50">{busy ? "Thinking..." : pending ? "Retry" : "Send"}</button></div>
      </form>
    </div>}
    <a href="/setting" className="text-sm text-text-secondary underline">Wallet, automation and connected tools in Settings</a>
    {proposalReview && (proposalReview.operation.tool === "vault.authorize" ? <WalletReview key={proposalReview.id} proposal={proposalReview} onClose={() => setProposalReview(null)} onUpdated={() => void proposals.refetch()} /> : <ActionReview key={proposalReview.id} proposal={proposalReview} onClose={() => setProposalReview(null)} onUpdated={() => void proposals.refetch()} />)}
    {review && <PaymentReview key={review.action.recordId} {...review} onClose={() => setReview(null)} />}
  </section>;
}
