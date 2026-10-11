import { randomUUID, createHash } from "node:crypto";
import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { circleHumanUserId, circleHumanRequest, circleHumanSessionKey } from "@/services/server/circle-human-wallet";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { readTreasuryVaultStatus } from "@/services/server/treasury-vault";
import { humanVaultAction } from "@/services/arc/human-vault-action";
import { HumanApprovalJournal } from "@/services/server/human-approval-journal";
import { vaultOwnership } from "@/services/server/vault-ownership";
import { circleContractChallenge } from "@/services/arc/circle-contract-challenge";
import { verifiedAgentExecutor, reconcileAgentExecutor } from "@/services/server/agent-executor";
import { reconcileVaultPayment } from "@/services/server/vault-payments";

export const runtime = "nodejs";
const sessions = new Map<string, { userToken: string; expiresAt: number; userId: string; initializeId: string }>();
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try { const principal = requireOperatorSession(request); if (principal.role !== "OWNER") return Response.json({ error: "Owner access is required" }, { status: 403, headers }); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401, headers }); }
  const executionWallet = await verifiedAgentExecutor(readTreasuryConfiguration().wallet.companyId).catch(() => null);
  return Response.json({ configured: Boolean(process.env.NEXT_PUBLIC_CIRCLE_APP_ID && (process.env.CIRCLE_USER_CONTROLLED_API_KEY || process.env.CIRCLE_API_KEY)), appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || null, executionWallet: executionWallet?.address || null, custody: "user_controlled", authentication: "pin", chain: "ARC-TESTNET" }, { headers });
}

export async function POST(request: Request) {
  let principal;
  try { principal = requireOperatorSession(request); requireSameOrigin(request); }
  catch { return Response.json({ error: "Workspace authorization is required" }, { status: 401, headers }); }
  if (principal.role !== "OWNER") return Response.json({ error: "Owner access is required" }, { status: 403, headers });
  try {
    if (!process.env.NEXT_PUBLIC_CIRCLE_APP_ID) return Response.json({ error: "Configure NEXT_PUBLIC_CIRCLE_APP_ID from Circle User Controlled Configurator first" }, { status: 503, headers });
    const { action, address, requestId, recordId } = await request.json();
    if (!["connect", "initialize", "wallets", "disconnect", "allow_recipient", "allow_approver", "pause", "unpause", "ownership", "accept_ownership", "configure_executor", "verify_executor", "approve_payment"].includes(action)) return Response.json({ error: "Unsupported wallet action" }, { status: 400, headers });
    const key = circleHumanSessionKey(request.headers.get("cookie") || "");
    const userId = circleHumanUserId(readTreasuryConfiguration().wallet.companyId, principal.id);
    if (action === "disconnect") { sessions.delete(key); return Response.json({ disconnected: true }, { headers }); }
    for (const [id, session] of sessions) if (session.expiresAt <= Date.now()) sessions.delete(id);
    if (action === "connect") {
      try { await circleHumanRequest(`/v1/w3s/users/${encodeURIComponent(userId)}`); }
      catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
        await circleHumanRequest("/v1/w3s/users", { userId });
      }
      const token = await circleHumanRequest("/v1/w3s/users/token", { userId });
      if (typeof token.userToken !== "string" || typeof token.encryptionKey !== "string") throw new Error("Circle did not return wallet authentication");
      sessions.set(key, { userToken: token.userToken, expiresAt: Date.now() + 15 * 60000, userId, initializeId: randomUUID() });
      return Response.json({ userToken: token.userToken, encryptionKey: token.encryptionKey, appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID }, { headers });
    }
    const session = sessions.get(key);
    if (!session || session.userId !== userId) return Response.json({ error: "Reconnect your human wallet session" }, { status: 401, headers });
    if (action === "verify_executor") return Response.json(await reconcileAgentExecutor(readTreasuryConfiguration().wallet.companyId), { headers });
    if (action === "ownership" || action === "accept_ownership") {
      const result = await circleHumanRequest("/v1/w3s/wallets?blockchain=ARC-TESTNET", undefined, session.userToken);
      const wallet = (result.wallets || []).find((item: { blockchain: string; address: string; custodyType?: string }) => item.blockchain === "ARC-TESTNET" && item.address.toLowerCase() === String(address).toLowerCase() && item.custodyType !== "DEVELOPER");
      if (!wallet) throw new Error("Select your connected Circle wallet");
      const ownership = await vaultOwnership(readTreasuryConfiguration().wallet.companyId, wallet.address, action === "ownership");
      if (action === "ownership") return Response.json(ownership, { headers });
      if (!ownership.nominated || ownership.accepted) throw new Error("The current owner must nominate this wallet first");
      if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error("A request UUID is required");
      const hex = createHash("sha256").update(JSON.stringify([userId, requestId])).digest("hex");
      const idempotencyKey = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
      const payload = circleContractChallenge(idempotencyKey, wallet.id, ownership.address, { abiFunctionSignature: "acceptOwnership()", abiParameters: [] });
      const journal = new HumanApprovalJournal(process.env.SETTLBOX_HUMAN_WALLET_DATABASE || ".data/human-wallet-approvals.sqlite");
      try {
        let challengeId = journal.reserve(userId, requestId, payload);
        if (!challengeId) {
          const challenge = await circleHumanRequest("/v1/w3s/user/transactions/contractExecution", payload, session.userToken);
          if (typeof challenge.challengeId !== "string") throw new Error("Circle did not return an approval challenge");
          journal.save(userId, requestId, challenge.challengeId); challengeId = challenge.challengeId;
        }
        return Response.json({ challengeId }, { headers });
      } finally { journal.close(); }
    }
    if (action === "wallets") {
      const result = await circleHumanRequest("/v1/w3s/wallets?blockchain=ARC-TESTNET", undefined, session.userToken);
      return Response.json({ wallets: (result.wallets || []).filter((wallet: { blockchain: string }) => wallet.blockchain === "ARC-TESTNET").map((wallet: { id: string; address: string; blockchain: string }) => ({ id: wallet.id, address: wallet.address, blockchain: wallet.blockchain })) }, { headers });
    }
    if (action !== "initialize") {
      if (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error("A new request UUID is required");
      const vault = await readTreasuryVaultStatus(readTreasuryConfiguration().wallet.companyId);
      if (vault.state !== "verified") throw new Error("A verified treasury vault is required");
      let call;
      if (action === "approve_payment") {
        if (typeof recordId !== "string") throw new Error("A saved obligation is required");
        const payment = await reconcileVaultPayment(readTreasuryConfiguration().wallet.companyId, recordId);
        if (payment.status !== "awaiting_approval") throw new Error("Payment is not awaiting a valid on-chain approval");
        call = { abiFunctionSignature: "approvePayment(bytes32)", abiParameters: [payment.id] };
      } else if (action === "configure_executor") {
        if (!vault.paused) throw new Error("Pause the vault before assigning the execution wallet");
        const target = await verifiedAgentExecutor(readTreasuryConfiguration().wallet.companyId);
        if (target.address.toLowerCase() === vault.administrator.toLowerCase() || target.address.toLowerCase() === vault.address.toLowerCase()) throw new Error("Execution and administration wallets must be separate");
        call = { abiFunctionSignature: "setExecutor(address)", abiParameters: [target.address] };
      } else call = humanVaultAction(action, address, vault.executor);
      if (action === "unpause" && !vault.approvalCapacityReady) throw new Error("Configure the required human approvers before activation");
      const result = await circleHumanRequest("/v1/w3s/wallets?blockchain=ARC-TESTNET", undefined, session.userToken);
      const wallet = (result.wallets || []).find((item: { blockchain: string; address: string; custodyType?: string }) => item.blockchain === "ARC-TESTNET" && item.address.toLowerCase() === vault.administrator.toLowerCase() && item.custodyType !== "DEVELOPER");
      if (!wallet) throw new Error("Your Circle wallet is not the vault administrator. Ownership must be transferred explicitly before administration is available");
      const hex = createHash("sha256").update(JSON.stringify([userId, requestId])).digest("hex");
      const idempotencyKey = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
      const journal = new HumanApprovalJournal(process.env.SETTLBOX_HUMAN_WALLET_DATABASE || ".data/human-wallet-approvals.sqlite");
      try {
        const payload = circleContractChallenge(idempotencyKey, wallet.id, vault.address, call);
        let challengeId = journal.reserve(userId, requestId, payload);
        if (!challengeId) {
          const challenge = await circleHumanRequest("/v1/w3s/user/transactions/contractExecution", payload, session.userToken);
          if (typeof challenge.challengeId !== "string") throw new Error("Circle did not return an approval challenge");
          challengeId = challenge.challengeId;
          journal.save(userId, requestId, challenge.challengeId);
        }
        return Response.json({ challengeId, status: "awaiting_human_signature" }, { headers });
      } finally { journal.close(); }
    }
    const result = await circleHumanRequest("/v1/w3s/user/initialize", { idempotencyKey: session.initializeId, accountType: "EOA", blockchains: ["ARC-TESTNET"] }, session.userToken);
    if (typeof result.challengeId !== "string") throw new Error("Circle did not return a wallet challenge");
    return Response.json({ challengeId: result.challengeId }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Human wallet is unavailable" }, { status: 503, headers }); }
}
