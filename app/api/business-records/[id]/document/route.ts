import { requireOperatorSession } from "@/services/server/operator-session";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";
import { openBusinessRecords } from "@/services/server/business-records";
import { openWorkspace } from "@/services/server/workspace-records";
import { renderBusinessDocument } from "@/services/server/business-document";
import { validateInvoicePresentation } from "@/types/invoice-presentation";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { requireOperatorSession(request); }
  catch { return Response.json({ error: "Operator sign-in is required" }, { status: 401 }); }
  const records = openBusinessRecords();
  const workspace = openWorkspace();
  try {
    const companyId = readTreasuryConfiguration().wallet.companyId;
    const record = records.get(companyId, (await context.params).id);
    if (!record) return Response.json({ error: "Business record not found" }, { status: 404 });
    const company = workspace.list(companyId, "company")[0];
    const settings = record.kind === "invoice" ? workspace.list(companyId, "invoice-settings")[0] : undefined;
    return new Response(renderBusinessDocument(record, typeof company?.companyName === "string" ? company.companyName : "Company workspace", settings ? validateInvoicePresentation(settings) : undefined), { headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    } });
  } finally { records.close(); workspace.close(); }
}
