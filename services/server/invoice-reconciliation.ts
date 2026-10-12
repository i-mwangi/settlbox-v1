import type { BusinessRecordRepository } from "./business-records";
import type { PaymentLinkRepository } from "./payment-links";

export function reconcileInvoiceCollections(companyId: string, repository: BusinessRecordRepository, links: PaymentLinkRepository) {
  return repository.list(companyId).map(record => {
    if (record.kind !== "invoice" || record.status !== "issued" || !record.paymentLinkCode) return record;
    const settlement = links.get(record.paymentLinkCode)?.records[0];
    return settlement ? repository.transition(companyId, record.id, "paid", ["issued"], { transactionHash: settlement.txid }) : record;
  });
}
