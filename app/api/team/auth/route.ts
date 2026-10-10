import { verifyMessage } from "viem";
import { createOperatorSession, requireSameOrigin, sessionCookie } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openTeamMembers } from "@/services/server/team-members";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { requireSameOrigin(request); } catch { return Response.json({ error: "Request origin is not authorized" }, { status: 403 }); }
  const repository = openTeamMembers();
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || !("action" in input)) throw new Error("Wallet authentication action is required");
    const companyId = readTreasuryConfiguration().wallet.companyId;
    if (input.action === "challenge") {
      if (!("address" in input) || typeof input.address !== "string") throw new Error("Wallet address is required");
      const token = "token" in input && typeof input.token === "string" ? input.token : undefined;
      return Response.json(repository.challenge(companyId, input.address, new URL(request.url).origin, token), { headers: { "Cache-Control": "no-store" } });
    }
    if (input.action !== "verify" || !("id" in input) || typeof input.id !== "string" || !("signature" in input) || typeof input.signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(input.signature)) throw new Error("A valid wallet signature is required");
    const challenge = repository.readChallenge(companyId, input.id);
    if (!await verifyMessage({ address: challenge.address as `0x${string}`, message: challenge.message, signature: input.signature as `0x${string}` })) throw new Error("Wallet signature was rejected");
    const member = repository.consumeChallenge(companyId, input.id);
    const session = createOperatorSession({ id: `member:${member.uuid}`, role: member.role, memberId: member.id, companyId });
    return Response.json({ authenticated: true }, { headers: { "Set-Cookie": sessionCookie(session.token, new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Wallet authorization failed. Renew the challenge or invitation and try again." }, { status: 401 }); }
  finally { repository.close(); }
}
