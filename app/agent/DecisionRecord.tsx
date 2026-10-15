import type {AgentRun} from "@/types/agent";

export default function DecisionRecord({run,expanded=false}:{run:AgentRun;expanded?:boolean}){
 const cash=run.cashPosition;
 return <details open={expanded||undefined} className="rounded-xl border border-primary-divider bg-background p-4 text-[14px]">
  <summary className="cursor-pointer font-semibold">Financial decision summary</summary>
  <p className="mt-3 text-[12px] text-text-secondary">Saved {new Date(run.createdAt).toLocaleString()} · Through {run.request.throughDate} · {run.fundingSource==="treasury_vault"?"Treasury vault":"Company wallet"} only</p>
  <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {[["Observed balance",run.balanceUsdc],["Existing commitments and liquidity floor",cash?.protectedUsdc],["Additional reserve",run.reserveUsdc],["Available before proposed payments",cash?.availableBeforePaymentsUsdc],["Eligible payments requiring review",cash?.reviewablePaymentsUsdc],["Remaining after eligible payments",run.unallocatedUsdc]].map(([label,value])=><div key={label} className="rounded-lg bg-app-background p-3"><dt className="text-[12px] text-text-secondary">{label}</dt><dd className="mt-1 font-medium">{value===undefined?"Not captured in this older snapshot":`${value} USDC`}</dd></div>)}
  </dl>
  <p className="mt-3 text-[12px] text-text-secondary">Priority: earliest due date first. Uncollected invoices are excluded from cash. Blocked obligations remain outstanding and are not deducted from the remaining figure. This is a plan from saved records, not a forecast of unknown expenses. Execution rechecks current policy, balance and approvals.</p>
  {cash&&<p className="mt-2">Blocked obligations: {cash.blockedPaymentsUsdc} USDC · Uncollected invoices: {cash.receivablesUsdc} USDC</p>}
  <ol className="mt-3 divide-y divide-primary-divider">{run.actions.map((action,index)=><li key={action.recordId} className="py-3 space-y-1"><p className="font-medium">{index+1}. {action.title} · {action.amountUsdc} USDC</p><p className="text-[12px] text-text-secondary">Due {action.dueDate} · {action.disposition==="blocked"?"Blocked":action.tool==="review_receivable"?"Collection review":"Eligible for payment review"}</p><p>{action.reasons.join(". ")}</p><p className="text-[12px] text-text-secondary break-all">Record: {action.recordId}</p></li>)}</ol>
  {!run.actions.length&&<p className="mt-3">No outstanding saved items within this planning period.</p>}
  <p className="mt-3 text-[12px] text-text-secondary break-all">Plan: {run.id} · Requested by: {run.requestedBy}</p>
 </details>;
}
