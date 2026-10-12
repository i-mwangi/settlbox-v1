import { notFound, redirect } from "next/navigation";
import { openSeededWorkspace } from "@/services/server/seeded-workspace";
import { openBusinessRecords } from "@/services/server/business-records";
import { readTreasuryConfiguration } from "@/services/server/treasury-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InvoiceCollectionPage({ searchParams }: {
  searchParams: Promise<{ uuid?: string; id?: string }>;
}) {
  const params = await searchParams;
  const id = params.uuid || params.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const workspace = openSeededWorkspace();
  const business = openBusinessRecords();
  let code: string | null = null;
  try {
    const companyId = readTreasuryConfiguration().wallet.companyId;
    const invoice = workspace.get(companyId, "entity-3").data.invoices.find(item => item.uuid === id);
    const record = typeof invoice?.businessRecordId === "string" ? business.get(companyId, invoice.businessRecordId) : undefined;
    if (record?.kind === "invoice" && ["issued", "paid"].includes(record.status)) code = record.paymentLinkCode;
  } finally { workspace.close(); business.close(); }
  if (!code) notFound();
  redirect(`/payment/${encodeURIComponent(code)}`);
}
