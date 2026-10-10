import { requireOperatorSession } from "@/services/server/operator-session";
import { openSeededWorkspace } from "@/services/server/seeded-workspace";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openBusinessRecords } from "@/services/server/business-records";
import { projectWorkspaceSettlement } from "@/services/server/workspace-settlement";
import { renderWorkspacePdf } from "@/services/server/workspace-pdf";
import { workspaceEntity } from "@/types/seeded-workspace";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Sign in to download workspace documents" }, { status: 401 }); }
  const workspace = openSeededWorkspace();
  const business = openBusinessRecords();
  try {
    const query = new URL(request.url).searchParams;
    const entity = workspaceEntity(query.get("entity") || "entity-3");
    const id = query.get("id");
    if (!id) throw new Error("Document ID is required");
    const config = readTreasuryConfiguration();
    const saved = workspace.get(config.wallet.companyId, entity);
    const data = projectWorkspaceSettlement(saved.data, entity === "entity-3" ? business.list(config.wallet.companyId) : [], config.wallet.address);
    const bytes = await renderWorkspacePdf(data, id);
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=\"settlbox-document.pdf\"", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Document could not be generated" }, { status: 400 }); }
  finally { workspace.close(); business.close(); }
}
