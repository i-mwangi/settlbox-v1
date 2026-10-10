import { resolve } from "node:path";
import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openWorkspace } from "@/services/server/workspace-records";
import { openPaymentLinks } from "@/services/server/payment-links";
import { GroupCollectionRepository } from "@/services/server/group-collections";
import type { Group } from "@/types/group-payment";

export const runtime = "nodejs";
async function handle(request: Request) {
  try { requireOperatorSession(request); if (request.method === "POST") requireSameOrigin(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const links = openPaymentLinks();
  const workspace = openWorkspace();
  const collections = new GroupCollectionRepository(resolve(process.env.SETTLBOX_BUSINESS_DATABASE || ".data/business.sqlite"));
  try {
    const { wallet } = readTreasuryConfiguration();
    if (request.method === "GET") return Response.json(collections.list(wallet.companyId).map(record => collections.hydrate(record, wallet.address, links)), { headers: { "Cache-Control": "no-store" } });
    const input: unknown = await request.json();
    if (!input || typeof input !== "object" || !("id" in input) || typeof input.id !== "string" || !("title" in input) || typeof input.title !== "string" || !("amount" in input) || typeof input.amount !== "string") throw new Error("Collection ID, title, and amount are required");
    let group: Group | undefined;
    if ("groupId" in input && input.groupId !== null) group = workspace.get(wallet.companyId, "payment-groups", input.groupId) as unknown as Group | undefined;
    if ("groupId" in input && input.groupId !== null && !group) throw new Error("Group not found");
    const memberCount = "memberCount" in input ? Number(input.memberCount) : 0;
    if (!group && (!Number.isSafeInteger(memberCount) || memberCount < 1 || memberCount > 100)) throw new Error("Between 1 and 100 contributors are required");
    const members = group?.members || Array.from({ length: memberCount }, (_, index) => ({ name: `Contributor ${index + 1}`, address: null }));
    const collection = collections.create(wallet.companyId, input.id, input.title, input.amount, group?.id || null, members, wallet.address);
    return Response.json(collections.hydrate(collection, wallet.address, links), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Collection request failed" }, { status: 400 }); }
  finally { collections.close(); workspace.close(); links.close(); }
}
export const GET = handle;
export const POST = handle;
