import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openAgentProposals } from "@/services/server/agent-proposals";
import { dispatchAgentOperation } from "@/services/server/agent-dispatch";
import { POST as humanWallet } from "@/app/api/treasury/human-wallet/route";
import { readTreasuryVaultStatus } from "@/services/server/treasury-vault";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/services/arc/network";
import { treasuryVaultAbi } from "@/services/arc/treasury-vault";
import { verifiedAgentExecutor } from "@/services/server/agent-executor";
import { openVaultPayments } from "@/services/server/vault-payments";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function handle(request: Request) {
  let principal;
  try { principal = requireOperatorSession(request); if (principal.role !== "OWNER") throw new Error(); if (request.method !== "GET") requireSameOrigin(request); }
  catch { return Response.json({ error: "Company owner authorization is required" }, { status: 403, headers }); }
  const store = openAgentProposals(); const company = readTreasuryConfiguration().wallet.companyId;
  try {
    if (request.method === "GET") {
      const payments = openVaultPayments();
      try { return Response.json(store.list(company, principal.id).map(proposal => {
        if (proposal.operation.tool !== "payment.review" || proposal.status === "completed") return proposal;
        const payment = payments.get(company, String(proposal.operation.arguments.recordId));
        return payment?.status === "paid" ? store.settledPayment(company, principal.id, proposal.id, { amount: payment.amount, recipient: payment.recipient, transactionHash: payment.transactionHash, status: payment.status }) : proposal;
      }), { headers }); } finally { payments.close(); }
    }
    const body = await request.json();
    if (typeof body.id !== "string" || !["confirm", "cancel", "verify"].includes(body.action) || Object.keys(body).some(key => !["id", "action"].includes(key))) throw new Error("Choose a saved proposal; its details cannot be changed during approval");
    if (body.action === "cancel") return Response.json(store.cancel(company, principal.id, body.id), { headers });
    const existing = store.get(company, principal.id, body.id);
    if (existing?.status === "completed") return Response.json(existing, { headers });
    if (existing?.operation.tool === "vault.authorize") {
      const a = existing.operation.arguments;
      if (body.action === "verify") {
        if (existing.status !== "awaiting_signature") throw new Error("No wallet signature is pending");
        const vault = await readTreasuryVaultStatus(company); if (vault.state !== "verified") throw new Error("Vault could not be verified");
        const reader = createPublicClient({ chain: arcTestnet, transport: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || arcTestnet.rpcUrls.default.http[0], { timeout: 10000, retryCount: 1 }) });
        const verified = a.action === "pause" ? vault.paused : a.action === "unpause" ? !vault.paused : a.action === "configure_executor" ? vault.executor.toLowerCase() === (await verifiedAgentExecutor(company)).address.toLowerCase() : await reader.readContract({ address: vault.address as `0x${string}`, abi: treasuryVaultAbi, functionName: a.action === "allow_recipient" ? "recipients" : "approvers", args: [a.address as `0x${string}`] });
        return Response.json(verified ? store.finish(company, principal.id, existing.id, "completed", { verifiedOnArc: true, action: a.action, address: a.address }) : existing, { headers });
      }
      const call = async (payload: unknown) => {
        const response = await humanWallet(new Request(new URL("/api/treasury/human-wallet", request.url), { method: "POST", headers: request.headers, body: JSON.stringify(payload) }));
        const value = await response.json(); if (!response.ok) throw new Error(value.error || "Wallet authorization could not be prepared"); return value;
      };
      const authentication = await call({ action: "connect" });
      if (existing.status === "awaiting_signature") return Response.json({ proposal: existing, challengeId: (existing.result as {challengeId:string}).challengeId, authentication }, { headers });
      store.claim(company, principal.id, existing.id);
      try { const result = await call({ ...a, requestId: existing.id }); const proposal = store.finish(company, principal.id, existing.id, "awaiting_signature", { challengeId: result.challengeId }); return Response.json({ proposal, challengeId: result.challengeId, authentication }, { headers }); }
      catch (error) { store.finish(company, principal.id, existing.id, "uncertain", undefined, "Check wallet history before preparing another authorization"); throw error; }
    }
    if (body.action === "verify" || existing?.operation.tool === "payment.review") throw new Error("This operation requires its secure payment screen");
    const proposal = store.claim(company, principal.id, body.id);
    try { const result = await dispatchAgentOperation(request, proposal.operation, proposal.id); return Response.json(store.finish(company, principal.id, proposal.id, result?.isError ? "failed" : proposal.operation.tool === "payout.submit" && result?.status === "uncertain" ? "uncertain" : "completed", result), { headers }); }
    catch (failure) {
      // A transport failure can follow a side effect. Never blindly repeat a dispatched call.
      return Response.json(store.finish(company, principal.id, proposal.id, "uncertain", undefined, failure instanceof Error ? failure.message : "The result is unresolved. Check current records before another action."), { headers });
    }
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Action could not be handled" }, { status: 409, headers }); }
  finally { store.close(); }
}
export const GET = handle;
export const POST = handle;
