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
function MessageContent({ text }: { text: string }) {
  const marker = "\nAttached receipt: ";
  const position = text.lastIndexOf(marker);
  if (position >= 0) {
    try {
      const attachment = JSON.parse(text.slice(position + marker.length));
      if (typeof attachment.receiptName === "string" && typeof attachment.receiptUrl === "string" && /^\/api\/uploads\/[a-z0-9-]+\.(png|jpg|jpeg)$/.test(attachment.receiptUrl)) return <>{text.slice(0, position)}<span className="mt-2 block text-[12px]">Receipt: {attachment.receiptName}</span></>;
    } catch { /* Older messages and ordinary text render unchanged. */ }
  }
  return <>{text}</>;
}
export default function AgentPage() {
  const { activeEntityId } = useDemo();
  const enabled = activeEntityId === "entity-3";
  const client = useQueryClient();
  const [proposalReview, setProposalReview] = useState<AgentProposal | null>(null);
  const session = useQuery({ queryKey: ["agent-chat-session"], enabled, gcTime: 0, queryFn: () => workspaceFetch<{ principal: { id: string; role: string } }>("/api/operator/session"), retry: false });
  const canChat = enabled && !!session.data && ["OWNER", "ADMIN"].includes(session.data.principal.role);
  const history = useQuery({ queryKey: ["agent-chat", activeEntityId, session.data?.principal.id], enabled: canChat, gcTime: 0, queryFn: () => workspaceFetch<AgentChatTurn[]>("/api/agent-chat"), retry: false });
  const proposals = useQuery({ queryKey: ["agent-actions", activeEntityId, session.data?.principal.id], enabled: canChat && session.data?.principal.role === "OWNER", gcTime: 0, refetchInterval: 15000, queryFn: () => workspaceFetch<AgentProposal[]>("/api/agent-actions"), retry: false });
  const openProposal = (proposal: AgentProposal, turn: AgentChatTurn) => {
    if (proposal.operation.tool === "payment.review") { const action = turn.run.actions.find(item => item.recordId === proposal.operation.arguments.recordId); if (action) setReview({ action, runId: turn.run.id }); }
    else setProposalReview(proposal);
  };
  const scopeRef = useRef(""); scopeRef.current = `${activeEntityId}:${session.data?.principal.id}`;
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ message: string; requestId: string; throughDate: string; reserveUsdc: string } | null>(null);
  const [review, setReview] = useState<{ action: AgentAction; runId: string } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [history.data?.length, busy]);
  useEffect(() => { setPending(null); setMessage(""); setReceipt(null); setError(""); setReview(null); setProposalReview(null); }, [activeEntityId, session.data?.principal.id]);
  const attachReceipt = async (file?: File) => {
    if (!file || busy || uploading || !canChat) return;
    const scope = scopeRef.current;
    setUploading(true); setError(""); setPending(null);
    try {
      if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error("Choose a PNG or JPEG receipt of at most 2 MB");
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Receipt could not be uploaded");
      if (scope === scopeRef.current) setReceipt({ url: result.url, name: file.name.slice(0, 150) });
    } catch (failure) { if (scope === scopeRef.current) setError(failure instanceof Error ? failure.message : "Receipt could not be uploaded"); }
    finally { setUploading(false); if (attachmentInput.current) attachmentInput.current.value = ""; }
  };
  const send = async (text = message) => {
    if (!text.trim() || busy || uploading || !canChat) return;
    const date = new Date(); date.setDate(date.getDate() + 30);
    const throughDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const content = receipt ? `${text.trim()}\nAttached receipt: ${JSON.stringify({ receiptUrl: receipt.url, receiptName: receipt.name })}` : text.trim();
    if (content.length > 2000) { setError("Shorten your message to leave room for the receipt details"); return; }
    const input = pending && pending.message === content ? pending : { message: content, requestId: crypto.randomUUID(), throughDate, reserveUsdc: "0" };
    const scope = scopeRef.current;
    setPending(input); setBusy(true); setError("");
    try { const turn = await workspaceFetch<AgentChatTurn>("/api/agent-chat", "POST", input); if (scope !== scopeRef.current) return; if (turn.proposal) openProposal(turn.proposal, turn); await proposals.refetch(); setMessage(""); setReceipt(null); setPending(null); await client.invalidateQueries({ queryKey: ["agent-chat", activeEntityId, session.data?.principal.id] }); await client.invalidateQueries({ queryKey: ["agent-runs"] }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Your message could not be sent"); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-5">
    <header><h1 className="text-[26px] font-bold leading-tight tracking-tight text-text-primary">Finance agent</h1><p className="mt-1 text-[14px] text-text-secondary">Tell me what you need. We'll review it together.</p></header>
    {canChat && proposals.data?.some(item=>item.turnId.startsWith("mcp:")&&item.status==="pending")&&<section aria-label="External assistant requests" className="rounded-2xl border border-primary-divider p-4 space-y-3"><h2 className="text-[20px] font-semibold">External assistant requests</h2>{proposals.data.filter(item=>item.turnId.startsWith("mcp:")&&item.status==="pending").map(item=><div key={item.id} className="flex flex-wrap justify-between gap-3 text-[14px]"><span>{item.operation.tool} · {new Date(item.createdAt).toLocaleString()}</span><div className="flex gap-3"><button disabled={busy} className="underline" onClick={async()=>{if(item.operation.tool!=="payment.review"){setProposalReview(item);return;}try{await workspaceFetch("/api/agent-actions","POST",{action:"review",id:item.id});await send(`Open payment review for the saved payable record ${String(item.operation.arguments.recordId)}. Do not change its terms.`);}catch(e){setError(e instanceof Error?e.message:"Review unavailable");}}}>Review</button><button disabled={busy} className="underline" onClick={async()=>{try{await workspaceFetch("/api/agent-actions","POST",{action:"cancel",id:item.id});await proposals.refetch();}catch(e){setError(e instanceof Error?e.message:"Dismissal failed");}}}>Dismiss</button></div></div>)}</section>}
    {!enabled ? <p role="status" className="rounded-2xl border border-primary-divider p-5">Select the company treasury workspace to chat.</p> : <div className="rounded-2xl border border-primary-divider bg-background overflow-hidden">
      <div className="border-b border-primary-divider px-5 py-3 text-[12px] text-text-secondary">Arc Testnet  -  Payments need your authorization</div>
      <div role="log" aria-label="Finance conversation" aria-live="polite" className="max-h-[60dvh] min-h-[260px] overflow-y-auto overscroll-contain p-5 space-y-6">
        {!history.data?.length && <div className="py-8 space-y-4"><h2 className="text-[20px] font-semibold">How can I help with your business today?</h2><p className="text-[14px] text-text-secondary">Ask about upcoming bills, treasury balances or a payment you want to review.</p><div className="flex flex-wrap gap-2">{suggestions.map(text => <button key={text} disabled={busy || !canChat || history.isLoading} onClick={() => { setMessage(text); void send(text); }} className="rounded-xl border border-primary-divider px-4 py-3 text-[14px] text-left disabled:opacity-50">{text}</button>)}</div></div>}
        {history.data?.map((turn, index) => <article key={turn.id} className="space-y-4">
          <div className="ml-auto max-w-[85%] w-fit rounded-2xl bg-[#1b1b1b] px-4 py-3 text-[14px] text-white whitespace-pre-wrap break-words"><MessageContent text={turn.message} /></div>
          <div className="max-w-[95%] space-y-3"><p className="text-[12px] font-medium text-text-secondary">Settlbox</p><p className="text-[14px] leading-6 whitespace-pre-wrap break-words">{turn.answer}</p>
            {turn.proposal && (() => { const proposal = proposals.data?.find(item => item.id === turn.proposal!.id) || turn.proposal; return <div className="rounded-xl border border-primary-divider p-3 text-[14px]"><p>{proposal.status === "completed" ? "Action completed and recorded." : proposal.status === "cancelled" ? "Review dismissed." : proposal.status === "uncertain" || proposal.status === "running" ? "Result unresolved. Check current records before another request." : "Your review is required."}</p>{!["cancelled"].includes(proposal.status) && <button className="mt-2 underline" onClick={() => openProposal(proposal, turn)}>{proposal.status === "completed" ? "View result" : "Open review"}</button>}</div>; })()}
            {index === history.data.length - 1 && <div className="space-y-2">{turn.run.actions.filter(action => !turn.recordIds || turn.recordIds.includes(action.recordId)).map(action => <div key={action.recordId} className="rounded-xl border border-primary-divider p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><p className="text-[14px] font-medium">{action.title}</p><p className="text-[14px]">{action.amountUsdc} USDC</p></div><p className="text-[12px] text-text-secondary">Due {action.dueDate}  -  {action.disposition === "blocked" ? "Needs attention" : action.tool === "review_receivable" ? "Incoming invoice" : "Ready for review"}</p>{action.disposition === "blocked" && <p className="text-[14px] text-text-secondary">{action.reasons.join(". ")}</p>}</div>)}<p className="text-[12px] text-text-secondary">Snapshot from {new Date(turn.createdAt).toLocaleString()}. Payment details are checked again before sending.</p></div>}
          </div>
        </article>)}
        {busy && pending && <div className="ml-auto max-w-[85%] w-fit rounded-2xl bg-[#1b1b1b] px-4 py-3 text-[14px] text-white whitespace-pre-wrap break-words"><MessageContent text={pending.message} /></div>}
        {busy && <p role="status" className="text-[14px] text-text-secondary">Checking your treasury and saved obligations...</p>}
        <div ref={end} />
      </div>
      <form className="border-t border-primary-divider p-4 space-y-3" onSubmit={event => { event.preventDefault(); void send(); }}>
        <div className="flex flex-wrap items-center gap-3 text-[14px]"><input ref={attachmentInput} type="file" accept="image/png,image/jpeg" aria-label="Receipt image" className="sr-only" disabled={busy || uploading || !canChat} onChange={event => void attachReceipt(event.target.files?.[0])} /><button type="button" disabled={busy || uploading || !canChat} onClick={() => attachmentInput.current?.click()} className="text-text-secondary underline disabled:opacity-50">{uploading ? "Uploading receipt..." : "Attach receipt"}</button>{receipt && <><span className="max-w-full break-all">{receipt.name}</span><button type="button" disabled={busy || uploading} onClick={() => { setReceipt(null); setPending(null); }}>Remove receipt</button></>}</div>
        {session.data && !canChat && <p role="status" className="text-[14px]">An owner or admin can use finance chat.</p>}
        {(error || history.error || session.error) && <p role="alert" className="text-[14px] text-red-600">{error || history.error?.message || session.error?.message}</p>}
        <div className="flex items-end gap-3"><textarea aria-label="Message the finance agent" placeholder="Ask about your business's money..." value={message} maxLength={2000} rows={2} disabled={busy || !canChat} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} onChange={event => { setMessage(event.target.value); setPending(null); }} className="min-w-0 flex-1 resize-y rounded-xl border border-primary-divider bg-background p-3 text-[14px] focus:outline-blue-600" /><button type="submit" disabled={busy || uploading || !canChat || !message.trim()} className="rounded-xl bg-[#1b1b1b] px-5 py-3 text-[14px] text-white disabled:opacity-50">{busy ? "Thinking..." : pending ? "Retry" : "Send"}</button></div>
      </form>
    </div>}
    <a href="/setting" className="text-[14px] text-text-secondary underline">Wallet, automation and connected tools in Settings</a>
    {proposalReview && (proposalReview.operation.tool === "vault.authorize" ? <WalletReview key={proposalReview.id} proposal={proposalReview} onClose={() => setProposalReview(null)} onUpdated={() => void proposals.refetch()} /> : <ActionReview key={proposalReview.id} proposal={proposalReview} onClose={() => setProposalReview(null)} onUpdated={() => void proposals.refetch()} />)}
    {review && <PaymentReview key={review.action.recordId} {...review} onClose={() => setReview(null)} />}
  </section>;
}
