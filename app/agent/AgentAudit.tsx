import type {AgentChatTurn} from "@/types/agent-chat";
import type {AgentProposal} from "@/types/agent-operation";
import DecisionRecord from "./DecisionRecord";

export default function AgentAudit({turns,proposals}:{turns:AgentChatTurn[];proposals:AgentProposal[]}){
 return <details className="rounded-2xl border border-primary-divider bg-background p-5 text-[14px]">
  <summary className="cursor-pointer font-semibold">Agent audit trail</summary>
  <p className="mt-3 text-[12px] text-text-secondary">Latest 30 saved conversations for your signed-in account, their decision snapshots and the latest recorded proposal state. A completed review does not itself prove payment settlement; verify the payment result and transaction receipt. These are application records, not a tamper-proof ledger or a record of the model's private reasoning.</p>
  <div className="mt-4 max-h-[60dvh] overflow-y-auto space-y-4">{[...turns].reverse().map(turn=>{
   const current=proposals.find(item=>item.id===turn.proposal?.id);
   const proposal=current||turn.proposal;
   return <article key={turn.id} className="rounded-xl border border-primary-divider p-4 space-y-3">
    <p className="text-[12px] text-text-secondary">{new Date(turn.createdAt).toLocaleString()}</p>
    <p className="font-medium whitespace-pre-wrap break-words">{turn.message.split("\nAttached receipt: ")[0]}</p>
    <p className="whitespace-pre-wrap break-words">{turn.answer}</p>
    <p>{proposal?`Operation: ${proposal.operation.tool} · ${current?"Current proposal state":"State captured with this conversation"}: ${proposal.status.replaceAll("_"," ")}`:"Analysis only — no action proposed"}</p>
    {proposal&&<p className="text-[12px] text-text-secondary break-all">Proposal: {proposal.id} · Prepared {new Date(proposal.createdAt).toLocaleString()}{typeof proposal.operation.arguments.recordId==="string"?` · Target record: ${proposal.operation.arguments.recordId}`:""}</p>}
    <DecisionRecord run={turn.run}/>
   </article>;
  })}</div>
  {!turns.length&&<p className="mt-3">No saved conversations yet.</p>}
  <a href="/transactions" className="inline-block mt-4 text-primary-blue underline">Open payment records and settlements</a>
 </details>;
}
