import { requireOperatorSession, requireSameOrigin } from "@/services/server/operator-session";
import { openTeamMembers } from "@/services/server/team-members";

export const runtime = "nodejs";
export async function PATCH(request: Request) {
  let principal;
  try { principal = requireOperatorSession(request, "profile"); requireSameOrigin(request); }
  catch { return Response.json({ error: "Workspace sign-in is required" }, { status: 401 }); }
  if (!principal.memberId || !principal.companyId) return Response.json({ error: "Operator access has no personal member profile. Use an invited team wallet for a personal profile." }, { status: 400 });
  const repository = openTeamMembers();
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object") throw new Error("Profile changes are required");
    const data = Object.fromEntries(Object.entries(input).filter(([key]) => ["firstName", "lastName", "profilePicture"].includes(key)));
    return Response.json(repository.update(principal.companyId, principal.memberId, data));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Profile could not be updated" }, { status: 400 }); }
  finally { repository.close(); }
}
